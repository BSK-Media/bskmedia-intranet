import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const month = body?.month as string | undefined;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return badRequest("Podaj month w formacie YYYY-MM");

    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const users = await prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: { id: true, name: true } });
    const goals = await prisma.employeeGoal.findMany({ where: { month } });
    const goalByUser = new Map(goals.map((g) => [g.userId, Number(g.targetHours)]));

    for (const u of users) {
      const target = goalByUser.get(u.id) ?? 160;
      const sum = await prisma.timeEntry.aggregate({ where: { userId: u.id, date: { gte: from, lte: to } }, _sum: { hours: true } });
      const hours = Number(sum._sum.hours ?? 0);
      if (hours < target) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: "MISSING_HOURS",
            title: "Brakuje godzin w timesheet",
            body: `Masz wpisane ${hours}h, a cel to ${target}h dla ${month}.`,
          },
        });
      }
    }

    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
