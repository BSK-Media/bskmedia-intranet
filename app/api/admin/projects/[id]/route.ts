import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { projectSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = projectSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const current = await prisma.project.findUnique({ where: { id: params.id } });
    const doneNow = current?.status !== "DONE" && parsed.data.status === "DONE";
    const completedAt = doneNow ? new Date() : current?.completedAt ?? null;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        monthlyRetainerAmount: parsed.data.monthlyRetainerAmount ?? null,
        fixedClientPrice: parsed.data.fixedClientPrice ?? null,
        hourlyClientRate: parsed.data.hourlyClientRate ?? null,
        completedAt,
      } as any,
    });

    await audit(auth.user.id, "UPDATE", "Project", updated.id, { name: updated.name });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    await prisma.project.delete({ where: { id: params.id } });
    await audit(auth.user.id, "DELETE", "Project", params.id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
