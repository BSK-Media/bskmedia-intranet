import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { clientSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = clientSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const updated = await prisma.client.update({ where: { id: params.id }, data: { name: parsed.data.name } });
    await audit(auth.user.id, "UPDATE", "Client", updated.id, { name: updated.name });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    await prisma.client.delete({ where: { id: params.id } });
    await audit(auth.user.id, "DELETE", "Client", params.id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
