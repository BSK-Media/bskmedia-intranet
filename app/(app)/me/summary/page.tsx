"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatHoursHM, formatPLN } from "@/lib/labels";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function SummaryPage() {
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data } = useSWR(`/api/me/summary?year=${year}&month=${month}`, fetcher);

  const current = data?.current;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Moje statystyki</CardTitle>
          <div className="flex items-center gap-2">
            <Input className="w-[90px]" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Rok" />
            <Input className="w-[120px]" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
          </div>
        </CardHeader>
        <CardContent>
          {!current ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard title="Twoja stawka / h" value={`${data.hourlyRateDefault?.toFixed?.(2) ?? 0} zł`} />
              <StatCard title="Godziny (łącznie)" value={formatHoursHM(current.hoursTotal)} />
              <StatCard title="Godziny (rozl. godzinowe)" value={formatHoursHM(current.hoursHourly)} />
              <StatCard title="Wynagrodzenie z godzin" value={formatPLN(current.payoutHourly)} />
              <StatCard title="Wyn. projektowe (mies.)" value={formatPLN(current.payoutProjectMonthly)} />
              <StatCard title="Wyn. projektowe (jednoraz.)" value={formatPLN(current.payoutProjectOneOff)} />
              <StatCard title="Premie" value={formatPLN(current.bonuses)} />
              <StatCard title="Szacowana pensja" value={formatPLN(current.total)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rok {data?.year ?? year} — zestawienie miesięczne</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Miesiąc</TH>
                <TH>Godziny</TH>
                <TH>Pensja (total)</TH>
                <TH>Efektywność (zł / h)</TH>
              </TR>
            </THead>
            <TBody>
              {(data?.yearRows ?? []).map((r: any) => (
                <TR key={r.month}>
                  <TD>{r.month}</TD>
                  <TD>{formatHoursHM(r.hoursTotal)}</TD>
                  <TD>{formatPLN(r.total)}</TD>
                  <TD>{r.efficiency ? `${r.efficiency.toFixed(2)} zł/h` : "0,00 zł/h"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}
