"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AdminProjectsClientsPage() {
  const { data: clients, isLoading } = useSWR("/api/admin/clients", fetcher);
  const [q, setQ] = React.useState("");

  const filtered = (clients ?? []).filter((c: any) => (c.name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Projekty</CardTitle>
          <div className="text-xs text-zinc-500">Wybierz klienta, aby wejść w jego projekty.</div>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj klienta..." className="w-[260px]" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-zinc-500">Ładowanie…</div>
        ) : filtered.length === 0 ? (
          <div className="text-zinc-500">Brak klientów.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c: any) => (
              <Link key={c.id} href={`/admin/projects/${c.id}`} className="block">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="mt-2 flex justify-end">
                    <Button variant="outline" size="sm">Wejdź</Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
