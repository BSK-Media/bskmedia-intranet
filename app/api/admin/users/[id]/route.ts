import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { userSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = userSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const data: any = {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      hourlyRateDefault: parsed.data.hourlyRateDefault,
      availability: parsed.data.availability ?? "AVAILABLE",
    };
    if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const updated = await prisma.user.update({ where: { id: params.id }, data });
    await audit(auth.user.id, "UPDATE", "User", updated.id, { email: updated.email, role: updated.role });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    await prisma.user.delete({ where: { id: params.id } });
    await audit(auth.user.id, "DELETE", "User", params.id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
