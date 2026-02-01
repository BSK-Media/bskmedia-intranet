"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function SummaryPage() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data } = useSWR(`/api/me/summary?month=${month}`, fetcher);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Podsumowanie</CardTitle>
          <Input className="w-[120px]" value={month} onChange={(e) => setMonth(e.target.value)} />
        </CardHeader>
        <CardContent>
          {!data?.me ? <div className="text-zinc-500">Ładowanie…</div> : (
            <ul className="grid gap-2 md:grid-cols-5">
              <li>Godziny: <b>{data.me.hours}</b></li>
              <li>Hourly: <b>{data.me.hourlyPayout}</b></li>
              <li>Fixed: <b>{data.me.fixedPayout}</b></li>
              <li>Premie: <b>{data.me.bonuses}</b></li>
              <li>Razem: <b>{data.me.total}</b></li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Projekty (z raportu)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Klient</TH><TH>Projekt</TH><TH>Przychód</TH><TH>Koszt</TH><TH>Marża</TH></TR></THead>
            <TBody>
              {(data?.projects ?? []).map((p: any) => (
                <TR key={p.projectId}><TD>{p.clientName}</TD><TD>{p.name}</TD><TD>{p.revenue}</TD><TD>{p.cost}</TD><TD>{p.margin}</TD></TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
