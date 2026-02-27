import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest } from "@/lib/http";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inRange(d: Date, from: Date, to: Date) {
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const projectId = String(ctx?.params?.id ?? "");
  if (!projectId) return badRequest("Brak projectId");

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? monthKey(new Date());
  if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("month=YYYY-MM");

  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const [user, assignment, timeEntries, bonuses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, hourlyRateDefault: true } }),
    prisma.assignment.findUnique({
      where: { userId_projectId: { userId, projectId } },
      include: { project: { include: { client: { select: { name: true } } } } },
    }),
    prisma.timeEntry.findMany({
      where: { userId, projectId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }],
      select: { id: true, date: true, hours: true, note: true, status: true },
    }),
    prisma.bonus.findMany({
      where: { userId, projectId, month },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true, amount: true, note: true },
    }),
  ]);

  if (!assignment) return badRequest("Nie masz dostępu do tego projektu");

  const p = assignment.project;
  const hourlyDefault = Number(user?.hourlyRateDefault ?? 0);
  const rate = Number(assignment.hourlyRateOverride ?? hourlyDefault ?? 0);

  const approved = timeEntries.filter((t) => t.status === "APPROVED");
  const hoursApproved = approved.reduce((a, t) => a + Number(t.hours), 0);
  const hourlyPayout = hoursApproved * rate;

  // Fixed payout for month
  let fixedPayout = 0;
  const fixed = Number(assignment.fixedPayoutAmount ?? 0);
  if (fixed) {
    if (p.cadence === "ONE_OFF") {
      const paidAt = (p.deadlineAt ?? p.contractEnd ?? p.contractStart ?? p.createdAt) ?? null;
      if (paidAt && inRange(paidAt, from, to)) fixedPayout = fixed;
    } else {
      const start = p.contractStart ?? p.createdAt;
      const end = p.contractEnd;
      if (!(start > to) && !(end && end < from)) fixedPayout = fixed;
    }
  }

  const bonus = bonuses.reduce((a, b) => a + Number(b.amount), 0);

  // Revenue approximation for efficiency
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
    const clientRate = Number(p.hourlyClientRate ?? 0);
    revenue = clientRate > 0 ? hoursApproved * clientRate : hourlyPayout * 1.3;
  }

  const cost = hourlyPayout + fixedPayout + bonus;
  const margin = revenue - cost;
  const efficiencyPerHour = hoursApproved > 0 ? margin / hoursApproved : 0;

  return ok({
    month,
    project: {
      id: p.id,
      name: p.name,
      client: p.client.name,
      billingType: p.billingType,
      cadence: p.cadence,
      status: p.status,
    },
    assignment: {
      hourlyRateOverride: assignment.hourlyRateOverride,
      fixedPayoutAmount: assignment.fixedPayoutAmount,
    },
    totals: {
      hoursApproved: Math.round(hoursApproved * 100) / 100,
      payout: Math.round((hourlyPayout + fixedPayout + bonus) * 100) / 100,
      bonus: Math.round(bonus * 100) / 100,
      efficiencyPerHour: Math.round(efficiencyPerHour * 100) / 100,
    },
    timeEntries: timeEntries.map((t) => ({
      ...t,
      hours: Number(t.hours),
    })),
    bonuses,
  });
}
