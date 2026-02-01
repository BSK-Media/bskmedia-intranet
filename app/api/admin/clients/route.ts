import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { clientSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return ok(clients);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = clientSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const created = await prisma.client.create({
      data: {
        name: parsed.data.name,
        note: parsed.data.note ?? undefined,
        contactName: parsed.data.contactName ?? undefined,
        contactEmail: parsed.data.contactEmail ?? undefined,
        contactPhone: parsed.data.contactPhone ?? undefined,
      },
    });
    await audit(auth.user.id, "CREATE", "Client", created.id, { name: created.name });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    if (!id) return badRequest("Brak id");

    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: parsed.data.name,
        note: parsed.data.note ?? undefined,
        contactName: parsed.data.contactName ?? undefined,
        contactEmail: parsed.data.contactEmail ?? undefined,
        contactPhone: parsed.data.contactPhone ?? undefined,
      },
    });
    await audit(auth.user.id, "UPDATE", "Client", updated.id, { name: updated.name });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) return badRequest("Brak id");

    await prisma.client.delete({ where: { id } });
    await audit(auth.user.id, "DELETE", "Client", id, {});
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
