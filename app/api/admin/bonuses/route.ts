import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { bonusSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const items = await prisma.bonus.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = bonusSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const created = await prisma.bonus.create({ data: { ...parsed.data, month: parsed.data.month ?? null, note: parsed.data.note ?? null } as any });
    await audit(auth.session.user.id, "CREATE", "Bonus", created.id, { userId: created.userId, amount: created.amount });
    return ok(created, { status: 201 });
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
    await prisma.bonus.delete({ where: { id } });
    await audit(auth.session.user.id, "DELETE", "Bonus", id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
