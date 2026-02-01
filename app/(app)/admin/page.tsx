"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AdminDashboard() {
  const { data: report } = useSWR("/api/admin/reports?month=" + new Date().toISOString().slice(0, 7), fetcher);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>KPIs (bieżący miesiąc)</CardTitle></CardHeader>
        <CardContent>
          {!report?.kpi ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <ul className="space-y-1">
              <li>Przychód: <b>{report.kpi.revenue}</b></li>
              <li>Koszt: <b>{report.kpi.cost}</b></li>
              <li>Marża: <b>{report.kpi.margin}</b></li>
              <li>Godziny: <b>{report.kpi.hours}</b></li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          Użyj menu po lewej: klienci, projekty, pracownicy, timesheet, raporty, czat.
        </CardContent>
      </Card>
    </div>
  );
}
