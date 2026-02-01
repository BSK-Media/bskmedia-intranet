import { requireRole } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { buildReport } from "@/lib/reporting";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("month=YYYY-MM");
      const [y, m] = month.split("-").map(Number);
      const report = await buildReport(new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59));
      return ok(report);
    }

    if (from && to) return ok(await buildReport(new Date(from), new Date(to)));
    return badRequest("Podaj month=YYYY-MM albo from/to");
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
