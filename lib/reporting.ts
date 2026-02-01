import { prisma } from "@/lib/db";
import { computePeriodReport } from "@/lib/finance";

export async function buildReport(from: Date, to: Date) {
  const [users, projects, assignments, timeEntries, bonuses] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, hourlyRateDefault: true } }),
    prisma.project.findMany({ include: { client: { select: { name: true } } } }),
    prisma.assignment.findMany(),
    prisma.timeEntry.findMany({ where: { date: { gte: from, lte: to } }, select: { userId: true, projectId: true, date: true, hours: true, status: true } }),
    prisma.bonus.findMany({ select: { userId: true, amount: true, type: true, month: true } }),
  ]);

  return computePeriodReport({
    from,
    to,
    users: users.map((u) => ({ ...u, hourlyRateDefault: Number(u.hourlyRateDefault) })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      billingType: p.billingType,
      cadence: p.cadence,
      hourlyClientRate: p.hourlyClientRate ? Number(p.hourlyClientRate) : null,
      monthlyRetainerAmount: p.monthlyRetainerAmount ? Number(p.monthlyRetainerAmount) : null,
      fixedClientPrice: p.fixedClientPrice ? Number(p.fixedClientPrice) : null,
      completedAt: p.completedAt,
    })),
    assignments: assignments.map((a) => ({
      userId: a.userId,
      projectId: a.projectId,
      hourlyRateOverride: a.hourlyRateOverride ? Number(a.hourlyRateOverride) : null,
      fixedPayoutAmount: a.fixedPayoutAmount ? Number(a.fixedPayoutAmount) : null,
    })),
    timeEntries: timeEntries.map((t) => ({ ...t, hours: Number(t.hours) })),
    bonuses: bonuses.map((b) => ({ ...b, amount: Number(b.amount) })),
  });
}
