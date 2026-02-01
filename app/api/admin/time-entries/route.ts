import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const items = await prisma.timeEntry.findMany({
    where: status ? { status: status as any } : undefined,
    include: { user: { select: { name: true, email: true } }, project: { include: { client: { select: { name: true } } } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return ok(items);
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { id, status } = body ?? {};
    if (!id || !["APPROVED", "REJECTED"].includes(status)) return badRequest("Niepoprawne dane");

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: { status, reviewedById: auth.session.user.id, reviewedAt: new Date() },
    });

    await audit(auth.session.user.id, "REVIEW", "TimeEntry", updated.id, { status });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Brak id");

  try {
    await prisma.timeEntry.delete({ where: { id } });
    await audit(auth.session.user.id, "DELETE", "TimeEntry", id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
