import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { buildReport } from "@/lib/reporting";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const clientId = String(ctx?.params?.id ?? "");
    if (!clientId) return badRequest("Brak id klienta");

    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return badRequest("month=YYYY-MM");

    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const [client, report, timeEntries, bonuses, users, assignments] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      buildReport(from, to),
      prisma.timeEntry.findMany({
        where: {
          project: { clientId },
          date: { gte: from, lte: to },
        },
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ date: "asc" }],
      }),
      prisma.bonus.findMany({
        where: {
          project: { clientId },
          month: { gte: month, lte: month },
        },
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      }),
      prisma.user.findMany({ select: { id: true, name: true, hourlyRateDefault: true } }),
      prisma.assignment.findMany({
        where: { project: { clientId } },
        select: {
          userId: true,
          projectId: true,
          hourlyRateOverride: true,
          fixedPayoutAmount: true,
          project: {
            select: {
              cadence: true,
              deadlineAt: true,
              createdAt: true,
              contractStart: true,
              contractEnd: true,
            },
          },
        },
      }),
    ]);

    if (!client) return badRequest("Nie znaleziono klienta");

    const clientProjects = (report.projects ?? []).filter((p: any) => p.clientId === clientId);

    const totals = clientProjects.reduce(
      (acc: any, p: any) => {
        acc.revenue += Number(p.revenue ?? 0);
        acc.cost += Number(p.cost ?? 0);
        acc.margin += Number(p.margin ?? 0);
        acc.hours += Number(p.hours ?? 0);
        return acc;
      },
      { revenue: 0, cost: 0, margin: 0, hours: 0 }
    );
    // Efektywność/h: koszt 1h pracy (payout / hours), nie marża/h.
    const efficiencyPerHour = totals.hours > 0 ? totals.payout / totals.hours : 0;

    const approved = timeEntries.filter((t) => t.status === "APPROVED");

    const userById = new Map(users.map((u) => [u.id, { ...u, hourlyRateDefault: Number(u.hourlyRateDefault ?? 0) }]));
    const aKey = (u: string, p: string) => `${u}:${p}`;
    const assignmentByKey = new Map(assignments.map((a) => [aKey(a.userId, a.projectId), a]));

    // Revenue-per-hour per project (based on computed report values; works also for fixed/retainer by allocating by hours).
    const revPerHourByProject = new Map<string, number>();
    for (const p of clientProjects as any[]) {
      const hrs = Number(p.hours ?? 0);
      const rev = Number(p.revenue ?? 0);
      revPerHourByProject.set(p.projectId, hrs > 0 ? rev / hrs : 0);
    }

    // Employee breakdown (hours, payout, revenue allocation, margin, efficiency, notes)
    const byEmployee = new Map<
      string,
      { userId: string; name: string; hours: number; payout: number; revenue: number; margin: number; efficiencyPerHour: number; notes: string[] }
    >();

    for (const t of approved) {
      const u = userById.get(t.userId);
      const a = assignmentByKey.get(aKey(t.userId, t.projectId));
      const isProjectPaid = Number(a?.fixedPayoutAmount ?? 0) > 0;
      const rate = Number(a?.hourlyRateOverride ?? u?.hourlyRateDefault ?? 0);
      const revPerHour = revPerHourByProject.get(t.projectId) ?? 0;
      const hours = Number(t.hours);
      const revenue = hours * revPerHour;
      const payout = isProjectPaid ? 0 : hours * rate;
      const margin = revenue - payout;

      const prev = byEmployee.get(t.userId) ?? {
        userId: t.userId,
        name: (t.user as any)?.name ?? u?.name ?? "",
        hours: 0,
        payout: 0,
        revenue: 0,
        margin: 0,
        efficiencyPerHour: 0,
        // TS: without an explicit type, [] can become never[] in this nullish-coalescing literal
        notes: [] as string[],
      };
      prev.hours += hours;
      prev.payout += payout;
      prev.revenue += revenue;
      prev.margin += margin;
      if (t.note) prev.notes.push(t.note);
      byEmployee.set(t.userId, prev);
    }

    // Add fixed (project-paid) payouts to employee breakdown.
    // Hours remain tracked, but hourly payout is zero for these assignments.
    const inRange = (d: Date) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
    for (const a of assignments as any[]) {
      const fixed = Number(a.fixedPayoutAmount ?? 0);
      if (!fixed) continue;

      let fixedPayout = 0;
      const p = a.project;
      if (p?.cadence === "ONE_OFF") {
        const paidAt = (p.deadlineAt ?? p.createdAt) as Date | null;
        if (paidAt && inRange(paidAt)) fixedPayout = fixed;
      } else {
        const start = (p?.contractStart ?? p?.createdAt) as Date;
        const end = (p?.contractEnd ?? null) as Date | null;
        if (!(start > to) && !(end && end < from)) fixedPayout = fixed;
      }

      if (!fixedPayout) continue;

      const prev = byEmployee.get(a.userId) ?? {
        userId: a.userId,
        name: userById.get(a.userId)?.name ?? "",
        hours: 0,
        payout: 0,
        revenue: 0,
        margin: 0,
        efficiencyPerHour: 0,
        notes: [] as string[],
      };
      prev.payout += fixedPayout;
      prev.margin -= fixedPayout;
      byEmployee.set(a.userId, prev);
    }

    for (const e of byEmployee.values()) {
      e.efficiencyPerHour = e.hours > 0 ? e.payout / e.hours : 0;
    }

    // Reviewer breakdown (who approved)
    const byReviewer = new Map<string, { reviewerId: string; name: string; hoursApproved: number; entries: number }>();
    for (const t of approved) {
      const reviewerId = t.reviewedById ?? "(brak)";
      const prev = byReviewer.get(reviewerId) ?? {
        reviewerId,
        name: (t.reviewedBy as any)?.name ?? (reviewerId === "(brak)" ? "(brak)" : ""),
        hoursApproved: 0,
        entries: 0,
      };
      prev.hoursApproved += Number(t.hours);
      prev.entries += 1;
      byReviewer.set(reviewerId, prev);
    }

    // Flatten notes
    const allNotes = approved
      .filter((t) => t.note)
      .map((t) => ({
        date: t.date,
        project: (t.project as any)?.name ?? "",
        employee: (t.user as any)?.name ?? "",
        hours: Number(t.hours),
        note: t.note as string,
      }));

    return ok({
      month,
      client: {
        id: client.id,
        name: client.name,
        note: client.note ?? null,
        contactName: client.contactName ?? null,
        contactEmail: client.contactEmail ?? null,
        contactPhone: client.contactPhone ?? null,
      },
      totals: {
        revenue: Math.round(totals.revenue * 100) / 100,
        cost: Math.round(totals.cost * 100) / 100,
        margin: Math.round(totals.margin * 100) / 100,
        hours: Math.round(totals.hours * 100) / 100,
        efficiencyPerHour: Math.round(efficiencyPerHour * 100) / 100,
      },
      projects: clientProjects,
      employees: [...byEmployee.values()]
        .map((e) => ({
          ...e,
          hours: Math.round(e.hours * 100) / 100,
          payout: Math.round(e.payout * 100) / 100,
          revenue: Math.round(e.revenue * 100) / 100,
          margin: Math.round(e.margin * 100) / 100,
          efficiencyPerHour: Math.round(e.efficiencyPerHour * 100) / 100,
        }))
        .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0)),
      approvals: [...byReviewer.values()].map((r) => ({
        ...r,
        hoursApproved: Math.round(r.hoursApproved * 100) / 100,
      })),
      notes: allNotes,
      bonuses: bonuses.map((b) => ({
        id: b.id,
        user: (b.user as any)?.name ?? "",
        project: (b.project as any)?.name ?? "",
        amount: Number((b as any).amount ?? 0),
        note: (b as any).note ?? null,
      })),
    });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
