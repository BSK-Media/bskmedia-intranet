import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { buildReport } from "@/lib/reporting";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return badRequest("month=YYYY-MM");

    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const report = await buildReport(from, to);

    const userId = auth.user.id;
    const me = report.employees.find((e) => e.userId === userId);

    const myAssignments = await prisma.assignment.findMany({ where: { userId }, select: { projectId: true } });
    const myProjectIds = new Set(myAssignments.map((a) => a.projectId));
    const projects = report.projects.filter((p) => myProjectIds.has(p.projectId));

    return ok({ month, me, kpi: report.kpi, projects });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
