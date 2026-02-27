"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MyProjectDetailPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useSWR(`/api/me/projects/${params.id}?month=${month}`, fetcher);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isLoading ? "Projekt…" : `${data?.project?.client ?? ""} — ${data?.project?.name ?? ""}`}</CardTitle>
          <Button asChild variant="outline">
            <Link href="/me/projects">← Moje projekty</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <div className="space-y-6">
              <div className="text-xs text-zinc-500">Miesiąc: <b>{data?.month}</b> (APPROVED w podsumowaniu)</div>

              <div className="grid gap-2 md:grid-cols-4">
                <div>Godziny (APPROVED): <b>{data?.totals?.hoursApproved}</b></div>
                <div>Wynagrodzenie (miesiąc): <b>{data?.totals?.payout}</b></div>
                <div>Premia (miesiąc): <b>{data?.totals?.bonus}</b></div>
                <div>Efektywność/h: <b>{data?.totals?.efficiencyPerHour}</b></div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Premie przypisane do projektu</div>
                <Table>
                  <THead><TR><TH>Kwota</TH><TH>Za co</TH></TR></THead>
                  <TBody>
                    {(data?.bonuses ?? []).length === 0 ? (
                      <TR><TD colSpan={2} className="text-zinc-500">Brak premii w tym miesiącu</TD></TR>
                    ) : (
                      (data?.bonuses ?? []).map((b: any) => (
                        <TR key={b.id}>
                          <TD>{b.amount}</TD>
                          <TD>{b.note ?? ""}</TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Raporty godzin</div>
                <Table>
                  <THead><TR><TH>Data</TH><TH>Godziny</TH><TH>Status</TH><TH>Notatka</TH></TR></THead>
                  <TBody>
                    {(data?.timeEntries ?? []).map((t: any) => (
                      <TR key={t.id}>
                        <TD>{String(t.date).slice(0, 10)}</TD>
                        <TD>{t.hours}</TD>
                        <TD>{t.status}</TD>
                        <TD>{t.note ?? ""}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
