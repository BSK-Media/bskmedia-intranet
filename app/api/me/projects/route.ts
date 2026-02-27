import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok } from "@/lib/http";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inRange(d: Date, from: Date, to: Date) {
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const now = new Date();
  const month = monthKey(now);
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [user, assignments, timeEntries, bonuses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, hourlyRateDefault: true } }),
    prisma.assignment.findMany({
      where: { userId },
      include: { project: { include: { client: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: { userId, status: "APPROVED", date: { gte: from, lte: to } },
      select: { projectId: true, hours: true },
    }),
    prisma.bonus.findMany({
      where: { userId, month, projectId: { not: null } },
      select: { projectId: true, amount: true },
    }),
  ]);

  const hourlyDefault = Number(user?.hourlyRateDefault ?? 0);

  const hoursByProject = new Map<string, number>();
  for (const t of timeEntries) hoursByProject.set(t.projectId, (hoursByProject.get(t.projectId) ?? 0) + Number(t.hours));

  const bonusByProject = new Map<string, number>();
  for (const b of bonuses) {
    if (!b.projectId) continue;
    bonusByProject.set(b.projectId, (bonusByProject.get(b.projectId) ?? 0) + Number(b.amount));
  }

  return ok({
    month,
    projects: assignments.map((a) => {
      const p = a.project;
      const hrs = hoursByProject.get(a.projectId) ?? 0;
      const rate = Number(a.hourlyRateOverride ?? hourlyDefault ?? 0);
      const isProjectPaid = Number(a.fixedPayoutAmount ?? 0) > 0;
      const hourlyPayout = isProjectPaid ? 0 : hrs * rate;

      // Fixed payout allocation for this month
      let fixedPayout = 0;
      const fixed = Number(a.fixedPayoutAmount ?? 0);
      if (fixed) {
        if (p.cadence === "ONE_OFF") {
          const paidAt = (p.deadlineAt ?? p.contractEnd ?? p.contractStart ?? p.createdAt) ?? null;
          if (paidAt && inRange(paidAt, from, to)) fixedPayout = fixed;
        } else {
          // recurring: treat fixed payout as monthly
          const start = p.contractStart ?? p.createdAt;
          const end = p.contractEnd;
          if (!(start > to) && !(end && end < from)) fixedPayout = fixed;
        }
      }

      const bonus = bonusByProject.get(a.projectId) ?? 0;

      // Revenue approximation for the month (used only for efficiency)
      let revenue = 0;
      if (p.billingType === "MONTHLY_RETAINER") {
        revenue = Number(p.monthlyRetainerAmount ?? 0);
      } else if (p.billingType === "FIXED") {
        if (p.cadence === "ONE_OFF") {
          const paidAt = (p.deadlineAt ?? p.contractEnd ?? p.contractStart ?? p.createdAt) ?? null;
          revenue = paidAt && inRange(paidAt, from, to) ? Number(p.fixedClientPrice ?? 0) : 0;
        } else {
          revenue = Number(p.fixedClientPrice ?? 0);
        }
      } else {
        // HOURLY
        const clientRate = Number(p.hourlyClientRate ?? 0);
        // If client rate is not set, approximate revenue from hours.
        // (Do not base it on employee payout, because project-paid assignments have hourlyPayout=0.)
        revenue = clientRate > 0 ? hrs * clientRate : (hrs * rate) * 1.3;
      }

      const cost = hourlyPayout + fixedPayout + bonus;
      const margin = revenue - cost;

      // Efektywność/h w widoku pracownika: realne wynagrodzenie za 1h (nie marża).
      // Dla wynagrodzenia projektowego godziny są informacyjne, ale możemy pokazać
      // „ile wychodzi na godzinę” jako (wynagrodzenie + premia) / godziny.
      const efficiencyPerHour = hrs > 0 ? (hourlyPayout + fixedPayout + bonus) / hrs : 0;

      return {
        projectId: a.projectId,
        name: p.name,
        client: p.client.name,
        billingType: p.billingType,
        status: p.status,
        cadence: p.cadence,
        tags: p.tags,
        hourlyRateOverride: a.hourlyRateOverride,
        fixedPayoutAmount: a.fixedPayoutAmount,
        hoursApproved: Math.round(hrs * 100) / 100,
        payout: Math.round((hourlyPayout + fixedPayout + bonus) * 100) / 100,
        efficiencyPerHour: Math.round(efficiencyPerHour * 100) / 100,
        bonus: Math.round(bonus * 100) / 100,
      };
    }),
  });
}
