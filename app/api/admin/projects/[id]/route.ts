import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { projectSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = projectSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const updated = await prisma.project.update({
      where: { id: ctx.params.id },
      data: {
        ...parsed.data,
        monthlyRetainerAmount: parsed.data.monthlyRetainerAmount ?? null,
        fixedClientPrice: parsed.data.fixedClientPrice ?? null,
        hourlyClientRate: parsed.data.hourlyClientRate ?? null,
        completedAt: parsed.data.status === "DONE" ? new Date() : null,
        contractStart: parsed.data.contractStart ? new Date(parsed.data.contractStart) : new Date(),
        contractEnd: parsed.data.contractEnd ? new Date(parsed.data.contractEnd) : null,
        deadlineAt: parsed.data.deadlineAt ? new Date(parsed.data.deadlineAt) : null,
      } as any,
    });

    await audit(auth.user.id, "UPDATE", "Project", updated.id, { name: updated.name });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const deleted = await prisma.project.delete({ where: { id: ctx.params.id } });
    await audit(auth.user.id, "DELETE", "Project", deleted.id, { name: deleted.name });
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
