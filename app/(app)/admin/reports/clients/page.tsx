"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ReportsClientsPage() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useSWR(`/api/admin/reports/clients?month=${month}`, fetcher);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Raporty → Klienci</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
            <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900" href={`/admin/reports?month=${month}`}>Podsumowanie</Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Klient</TH>
                  <TH>Przychód</TH>
                  <TH>Koszt</TH>
                  <TH>Marża</TH>
                  <TH>Godziny</TH>
                  <TH>Efektywność/h</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {(data?.clients ?? []).map((c: any) => (
                  <TR key={c.clientId}>
                    <TD>{c.clientName}</TD>
                    <TD>{c.revenue}</TD>
                    <TD>{c.cost}</TD>
                    <TD>{c.margin}</TD>
                    <TD>{c.hours}</TD>
                    <TD>{c.efficiencyPerHour}</TD>
                    <TD className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/reports/clients/${c.clientId}?month=${month}`}>Szczegóły</Link>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
