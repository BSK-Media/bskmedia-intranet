import { requireRole } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { buildReport } from "@/lib/reporting";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return badRequest("month=YYYY-MM");

    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const report = await buildReport(from, to);

    const byClient = new Map<string, { clientId: string; clientName: string; revenue: number; cost: number; margin: number; hours: number }>();
    for (const p of report.projects ?? []) {
      const clientId = (p as any).clientId as string | undefined;
      if (!clientId) continue;
      const prev = byClient.get(clientId) ?? { clientId, clientName: p.clientName, revenue: 0, cost: 0, margin: 0, hours: 0 };
      prev.revenue += Number(p.revenue ?? 0);
      prev.cost += Number(p.cost ?? 0);
      prev.margin += Number(p.margin ?? 0);
      prev.hours += Number(p.hours ?? 0);
      byClient.set(clientId, prev);
    }

    const clients = [...byClient.values()]
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
        cost: Math.round(c.cost * 100) / 100,
        margin: Math.round(c.margin * 100) / 100,
        hours: Math.round(c.hours * 100) / 100,
        efficiencyPerHour: c.hours > 0 ? Math.round(((c.margin / c.hours) * 100)) / 100 : 0,
      }))
      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));

    return ok({ month, clients });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
