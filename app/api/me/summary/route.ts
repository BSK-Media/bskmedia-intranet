import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("month=YYYY-MM");
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);
  return { from, to };
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsInYear(year: number) {
  const out: { key: string; from: Date; to: Date }[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    out.push({ key, from: new Date(year, m - 1, 1), to: new Date(year, m, 0, 23, 59, 59) });
  }
  return out;
}

function overlapsMonth(monthFrom: Date, monthTo: Date, start?: Date | null, end?: Date | null) {
  const a = (start ?? monthFrom).getTime() <= monthTo.getTime();
  const b = (end ?? monthTo).getTime() >= monthFrom.getTime();
  return a && b;
}

export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const yearStr = url.searchParams.get("year");
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const year = yearStr ? Number(yearStr) : Number(month.slice(0, 4));
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return badRequest("year=YYYY");

    const userId = auth.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, hourlyRateDefault: true, name: true } });
    if (!user) return ok({});

    const yearFrom = new Date(year, 0, 1);
    const yearTo = new Date(year, 11, 31, 23, 59, 59);

    const [assignments, timeEntries, bonuses] = await Promise.all([
      prisma.assignment.findMany({
        where: { userId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              cadence: true,
              billingType: true,
              status: true,
              contractStart: true,
              contractEnd: true,
              deadlineAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          userId,
          status: "APPROVED",
          date: { gte: yearFrom, lte: yearTo },
        },
        select: { date: true, hours: true, projectId: true },
      }),
      prisma.bonus.findMany({
        where: {
          userId,
          month: { startsWith: `${year}-` },
        },
        select: { amount: true, type: true, month: true, createdAt: true },
      }),
    ]);

    const assignmentByProject = new Map(assignments.map((a) => [a.projectId, a]));

    const monthStats = new Map<string, {
      hoursTotal: number;
      hoursHourly: number;
      payoutHourly: number;
      payoutProjectMonthly: number;
      payoutProjectOneOff: number;
      bonuses: number;
    }>();

    const init = (k: string) => {
      if (!monthStats.has(k)) monthStats.set(k, { hoursTotal: 0, hoursHourly: 0, payoutHourly: 0, payoutProjectMonthly: 0, payoutProjectOneOff: 0, bonuses: 0 });
      return monthStats.get(k)!;
    };

    // hours + hourly payout
    for (const t of timeEntries) {
      const key = monthKey(t.date);
      const st = init(key);
      const hrs = Number(t.hours);
      st.hoursTotal += hrs;

      const a = assignmentByProject.get(t.projectId);
      const isProjectPaid = Number(a?.fixedPayoutAmount ?? 0) > 0;
      if (!isProjectPaid) {
        const rate = Number(a?.hourlyRateOverride ?? user.hourlyRateDefault ?? 0);
        st.hoursHourly += hrs;
        st.payoutHourly += hrs * rate;
      }
    }

    // monthly project payouts (projectowe co miesiąc)
    const months = monthsInYear(year);
    for (const a of assignments) {
      const fixed = Number(a.fixedPayoutAmount ?? 0);
      if (!fixed) continue;
      const p = a.project;
      if (p.cadence === "ONE_OFF") {
        const paidAt = (p.deadlineAt ?? p.createdAt) as Date;
        const k = monthKey(paidAt);
        if (k.startsWith(`${year}-`)) {
          init(k).payoutProjectOneOff += fixed;
        }
      } else {
        for (const mo of months) {
          if (!overlapsMonth(mo.from, mo.to, p.contractStart, p.contractEnd)) continue;
          // (opcjonalnie można tu dodać aktywność z Assignment.activeFrom/activeTo w przyszłości)
          init(mo.key).payoutProjectMonthly += fixed;
        }
      }
    }

    // bonuses
    for (const b of bonuses) {
      const k = String(b.month ?? "");
      if (!k || !k.startsWith(`${year}-`)) continue;
      init(k).bonuses += Number(b.amount);
    }

    // build response
    const yearRows = months.map(({ key }) => {
      const st = monthStats.get(key) ?? { hoursTotal: 0, hoursHourly: 0, payoutHourly: 0, payoutProjectMonthly: 0, payoutProjectOneOff: 0, bonuses: 0 };
      const total = st.payoutHourly + st.payoutProjectMonthly + st.payoutProjectOneOff + st.bonuses;
      const eff = st.hoursTotal > 0 ? total / st.hoursTotal : 0;
      return {
        month: key,
        hoursTotal: Math.round(st.hoursTotal * 100) / 100,
        hoursHourly: Math.round(st.hoursHourly * 100) / 100,
        payoutHourly: Math.round(st.payoutHourly * 100) / 100,
        payoutProjectMonthly: Math.round(st.payoutProjectMonthly * 100) / 100,
        payoutProjectOneOff: Math.round(st.payoutProjectOneOff * 100) / 100,
        bonuses: Math.round(st.bonuses * 100) / 100,
        total: Math.round(total * 100) / 100,
        efficiency: Math.round(eff * 100) / 100,
      };
    });

    const current = yearRows.find((r) => r.month === month) ?? yearRows[0];

    return ok({
      year,
      month,
      hourlyRateDefault: Number(user.hourlyRateDefault ?? 0),
      current,
      yearRows,
    });
  } catch (e: any) {
    if (String(e?.message ?? "").includes("month=YYYY-MM")) return badRequest("month=YYYY-MM");
    return serverError(e?.message ?? "Błąd");
  }
}
