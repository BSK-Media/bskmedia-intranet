import { BillingType, ProjectCadence, TimeEntryStatus } from "@prisma/client";

export type FinanceInput = {
  from: Date;
  to: Date;
  users: { id: string; name: string; hourlyRateDefault: number }[];
  projects: {
    id: string;
    name: string;
    clientName: string;
    billingType: BillingType;
    cadence: ProjectCadence;
    hourlyClientRate?: number | null;
    monthlyRetainerAmount?: number | null;
    fixedClientPrice?: number | null;
    completedAt?: Date | null;
  }[];
  assignments: { userId: string; projectId: string; hourlyRateOverride?: number | null; fixedPayoutAmount?: number | null }[];
  timeEntries: { userId: string; projectId: string; date: Date; hours: number; status: TimeEntryStatus }[];
  bonuses: { userId: string; amount: number; type: "ONE_OFF" | "MONTHLY"; month?: string | null }[];
};

export type PeriodReport = {
  from: string;
  to: string;
  kpi: { revenue: number; cost: number; margin: number; hours: number; activeProjects: number };
  employees: { userId: string; name: string; hours: number; hourlyPayout: number; fixedPayout: number; bonuses: number; total: number }[];
  projects: { projectId: string; name: string; clientName: string; revenue: number; cost: number; margin: number; hours: number }[];
  top: {
    projectsByRevenue: { projectId: string; name: string; clientName: string; revenue: number; cost: number; margin: number; hours: number }[];
    clientsByRevenue: { clientName: string; revenue: number }[];
    employeesByPayout: { userId: string; name: string; hours: number; hourlyPayout: number; fixedPayout: number; bonuses: number; total: number }[];
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const inRange = (d: Date, from: Date, to: Date) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime();

function monthCount(from: Date, to: Date) {
  const a = new Date(from.getFullYear(), from.getMonth(), 1);
  const b = new Date(to.getFullYear(), to.getMonth(), 1);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

export function computePeriodReport(input: FinanceInput): PeriodReport {
  const { from, to } = input;
  const userById = new Map(input.users.map((u) => [u.id, u]));
  const projectById = new Map(input.projects.map((p) => [p.id, p]));
  const aKey = (u: string, p: string) => `${u}:${p}`;
  const assignmentByKey = new Map(input.assignments.map((a) => [aKey(a.userId, a.projectId), a]));

  const approved = input.timeEntries.filter((t) => t.status === "APPROVED" && inRange(t.date, from, to));

  const projectHours = new Map<string, number>();
  const projectHourlyCost = new Map<string, number>();
  const employeeHours = new Map<string, number>();
  const employeeHourly = new Map<string, number>();

  for (const t of approved) {
    const u = userById.get(t.userId);
    const p = projectById.get(t.projectId);
    if (!u || !p) continue;
    const a = assignmentByKey.get(aKey(u.id, p.id));
    const rate = Number(a?.hourlyRateOverride ?? u.hourlyRateDefault ?? 0);
    projectHours.set(p.id, (projectHours.get(p.id) ?? 0) + t.hours);
    projectHourlyCost.set(p.id, (projectHourlyCost.get(p.id) ?? 0) + t.hours * rate);
    employeeHours.set(u.id, (employeeHours.get(u.id) ?? 0) + t.hours);
    employeeHourly.set(u.id, (employeeHourly.get(u.id) ?? 0) + t.hours * rate);
  }

  // fixed payouts
  const employeeFixed = new Map<string, number>();
  const projectFixedCost = new Map<string, number>();
  for (const a of input.assignments) {
    const p = projectById.get(a.projectId);
    if (!p || p.billingType !== "FIXED") continue;
    const fixed = Number(a.fixedPayoutAmount ?? 0);
    if (!fixed) continue;

    if (p.cadence === "ONE_OFF") {
      if (p.completedAt && inRange(p.completedAt, from, to)) {
        employeeFixed.set(a.userId, (employeeFixed.get(a.userId) ?? 0) + fixed);
        projectFixedCost.set(p.id, (projectFixedCost.get(p.id) ?? 0) + fixed);
      }
    } else {
      const months = monthCount(from, to);
      employeeFixed.set(a.userId, (employeeFixed.get(a.userId) ?? 0) + fixed * months);
      projectFixedCost.set(p.id, (projectFixedCost.get(p.id) ?? 0) + fixed * months);
    }
  }

  // bonuses (overhead on employee)
  const bonusSum = new Map<string, number>();
  for (const b of input.bonuses) {
    bonusSum.set(b.userId, (bonusSum.get(b.userId) ?? 0) + b.amount);
  }

  // revenue by project
  const projectRevenue = new Map<string, number>();
  for (const p of input.projects) {
    if (p.billingType === "MONTHLY_RETAINER") {
      const months = monthCount(from, to);
      projectRevenue.set(p.id, Number(p.monthlyRetainerAmount ?? 0) * months);
      continue;
    }
    if (p.billingType === "FIXED") {
      if (p.cadence === "ONE_OFF") {
        projectRevenue.set(p.id, p.completedAt && inRange(p.completedAt, from, to) ? Number(p.fixedClientPrice ?? 0) : 0);
      } else {
        const months = monthCount(from, to);
        projectRevenue.set(p.id, Number(p.fixedClientPrice ?? 0) * months);
      }
      continue;
    }
    // HOURLY
    const hrs = projectHours.get(p.id) ?? 0;
    const rate = Number(p.hourlyClientRate ?? 0);
    if (rate > 0) projectRevenue.set(p.id, hrs * rate);
    else projectRevenue.set(p.id, (projectHourlyCost.get(p.id) ?? 0) * 1.3);
  }

  const projects = input.projects.map((p) => {
    const rev = projectRevenue.get(p.id) ?? 0;
    const cost = (projectHourlyCost.get(p.id) ?? 0) + (projectFixedCost.get(p.id) ?? 0);
    const hrs = projectHours.get(p.id) ?? 0;
    return { projectId: p.id, name: p.name, clientName: p.clientName, revenue: round2(rev), cost: round2(cost), margin: round2(rev - cost), hours: round2(hrs) };
  });

  const employees = input.users.map((u) => {
    const hrs = employeeHours.get(u.id) ?? 0;
    const hourly = employeeHourly.get(u.id) ?? 0;
    const fixed = employeeFixed.get(u.id) ?? 0;
    const bonuses = bonusSum.get(u.id) ?? 0;
    const total = hourly + fixed + bonuses;
    return { userId: u.id, name: u.name, hours: round2(hrs), hourlyPayout: round2(hourly), fixedPayout: round2(fixed), bonuses: round2(bonuses), total: round2(total) };
  });

  const revenueTotal = projects.reduce((a, p) => a + p.revenue, 0);
  const projectCostTotal = projects.reduce((a, p) => a + p.cost, 0);
  const bonusTotal = employees.reduce((a, e) => a + e.bonuses, 0);
  const costTotal = projectCostTotal + bonusTotal;
  const hoursTotal = employees.reduce((a, e) => a + e.hours, 0);

  const byClient = new Map<string, number>();
  for (const p of projects) byClient.set(p.clientName, (byClient.get(p.clientName) ?? 0) + p.revenue);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    kpi: { revenue: round2(revenueTotal), cost: round2(costTotal), margin: round2(revenueTotal - costTotal), hours: round2(hoursTotal), activeProjects: input.projects.length },
    employees,
    projects,
    top: {
      projectsByRevenue: [...projects].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      clientsByRevenue: [...byClient.entries()].map(([clientName, revenue]) => ({ clientName, revenue: round2(revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      employeesByPayout: [...employees].sort((a, b) => b.total - a.total).slice(0, 5),
    },
  };
}
