"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ReportsPage() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useSWR(`/api/admin/reports?month=${month}`, fetcher);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Raport</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
            <a className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900" href={`/api/admin/export/report?month=${month}`}>Eksport CSV</a>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !data?.kpi ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <ul className="grid gap-2 md:grid-cols-4">
              <li>Przychód: <b>{data.kpi.revenue}</b></li>
              <li>Koszt: <b>{data.kpi.cost}</b></li>
              <li>Marża: <b>{data.kpi.margin}</b></li>
              <li>Godziny: <b>{data.kpi.hours}</b></li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top projekty</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Klient</TH><TH>Projekt</TH><TH>Przychód</TH><TH>Koszt</TH><TH>Marża</TH></TR></THead>
            <TBody>
              {(data?.top?.projectsByRevenue ?? []).map((p: any) => (
                <TR key={p.projectId}>
                  <TD>{p.clientName}</TD><TD>{p.name}</TD><TD>{p.revenue}</TD><TD>{p.cost}</TD><TD>{p.margin}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
