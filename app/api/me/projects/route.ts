import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok } from "@/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include: { project: { include: { client: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(assignments.map((a) => ({
    projectId: a.projectId,
    name: a.project.name,
    client: a.project.client.name,
    billingType: a.project.billingType,
    status: a.project.status,
    cadence: a.project.cadence,
    tags: a.project.tags,
    hourlyRateOverride: a.hourlyRateOverride,
    fixedPayoutAmount: a.fixedPayoutAmount,
  })));
}
