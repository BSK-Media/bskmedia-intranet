import { requireRole } from "@/lib/guards";
import { badRequest } from "@/lib/http";
import { buildReport } from "@/lib/reporting";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const month = new URL(req.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return badRequest("Podaj month=YYYY-MM");

  const [y, m] = month.split("-").map(Number);
  const report = await buildReport(new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59));

  const csv = toCsv(
    report.projects.map((p) => ({
      client: p.clientName,
      project: p.name,
      revenue: p.revenue,
      cost: p.cost,
      margin: p.margin,
      hours: p.hours,
    })),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="report-${month}.csv"`,
    },
  });
}
