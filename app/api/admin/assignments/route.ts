import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { assignmentSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const items = await prisma.assignment.findMany({
    include: { user: { select: { name: true, email: true } }, project: { include: { client: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = assignmentSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const upserted = await prisma.assignment.upsert({
      where: { userId_projectId: { userId: parsed.data.userId, projectId: parsed.data.projectId } },
      update: {
        hourlyRateOverride: parsed.data.hourlyRateOverride ?? null,
        fixedPayoutAmount: parsed.data.fixedPayoutAmount ?? null,
      },
      create: {
        userId: parsed.data.userId,
        projectId: parsed.data.projectId,
        hourlyRateOverride: parsed.data.hourlyRateOverride ?? null,
        fixedPayoutAmount: parsed.data.fixedPayoutAmount ?? null,
      },
    });

    await audit(auth.session.user.id, "UPSERT", "Assignment", upserted.id, { userId: upserted.userId, projectId: upserted.projectId });
    return ok(upserted);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const projectId = url.searchParams.get("projectId");
  if (!userId || !projectId) return badRequest("Brak parametrów userId/projectId");

  try {
    await prisma.assignment.delete({ where: { userId_projectId: { userId, projectId } } });
    await audit(auth.session.user.id, "DELETE", "Assignment", `${userId}:${projectId}`);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
