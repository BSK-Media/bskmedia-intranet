"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ClientReportDetailPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useSWR(`/api/admin/reports/clients/${params.id}?month=${month}`, fetcher);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isLoading ? "Klient…" : `Klient: ${data?.client?.name ?? ""}`}</CardTitle>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/reports/clients?month=${month}`}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              )}
            >
              ← Lista klientów
            </Link>
            <Link
              href={`/admin/reports?month=${month}`}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              )}
            >
              Podsumowanie
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-zinc-500">Ładowanie…</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-2 md:grid-cols-5">
                <div>Przychód: <b>{data?.totals?.revenue}</b></div>
                <div>Koszt: <b>{data?.totals?.cost}</b></div>
                <div>Marża: <b>{data?.totals?.margin}</b></div>
                <div>Godziny: <b>{data?.totals?.hours}</b></div>
                <div>Efektywność/h: <b>{data?.totals?.efficiencyPerHour}</b></div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Projekty</div>
                <Table>
                  <THead><TR><TH>Projekt</TH><TH>Przychód</TH><TH>Koszt</TH><TH>Premie</TH><TH>Marża</TH><TH>Godziny</TH></TR></THead>
                  <TBody>
                    {(data?.projects ?? []).map((p: any) => (
                      <TR key={p.projectId}>
                        <TD>{p.name}</TD>
                        <TD>{p.revenue}</TD>
                        <TD>{p.cost}</TD>
                        <TD>{p.bonuses}</TD>
                        <TD>{p.margin}</TD>
                        <TD>{p.hours}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Pracownicy (wkład w miesiącu)</div>
                <Table>
                  <THead><TR><TH>Pracownik</TH><TH>Godziny</TH><TH>Przychód (alok.)</TH><TH>Koszt</TH><TH>Marża</TH><TH>Efektywność/h</TH></TR></THead>
                  <TBody>
                    {(data?.employees ?? []).map((e: any) => (
                      <TR key={e.userId}>
                        <TD>{e.name}</TD>
                        <TD>{e.hours}</TD>
                        <TD>{e.revenue}</TD>
                        <TD>{e.payout}</TD>
                        <TD>{e.margin}</TD>
                        <TD>{e.efficiencyPerHour}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Zatwierdzenia godzin (kto zatwierdził)</div>
                <Table>
                  <THead><TR><TH>Osoba</TH><TH>Ile wpisów</TH><TH>Godziny zatwierdzone</TH></TR></THead>
                  <TBody>
                    {(data?.approvals ?? []).map((a: any) => (
                      <TR key={a.reviewerId}>
                        <TD>{a.name}</TD>
                        <TD>{a.entries}</TD>
                        <TD>{a.hoursApproved}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Premie przypisane do projektów (miesiąc)</div>
                <Table>
                  <THead><TR><TH>Pracownik</TH><TH>Projekt</TH><TH>Kwota</TH><TH>Za co</TH></TR></THead>
                  <TBody>
                    {(data?.bonuses ?? []).map((b: any) => (
                      <TR key={b.id}>
                        <TD>{b.user}</TD>
                        <TD>{b.project}</TD>
                        <TD>{b.amount}</TD>
                        <TD>{b.note ?? ""}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Notatki z raportów godzin (APPROVED)</div>
                <Table>
                  <THead><TR><TH>Data</TH><TH>Projekt</TH><TH>Pracownik</TH><TH>Godziny</TH><TH>Notatka</TH></TR></THead>
                  <TBody>
                    {(data?.notes ?? []).map((n: any, idx: number) => (
                      <TR key={idx}>
                        <TD>{String(n.date).slice(0, 10)}</TD>
                        <TD>{n.project}</TD>
                        <TD>{n.employee}</TD>
                        <TD>{n.hours}</TD>
                        <TD>{n.note}</TD>
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
