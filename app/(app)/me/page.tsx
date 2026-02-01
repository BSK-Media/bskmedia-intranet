"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MeDashboard() {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = useSWR(`/api/me/summary?month=${month}`, fetcher);
  const { data: notifications } = useSWR("/api/me/notifications", fetcher);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Moje podsumowanie ({month})</CardTitle></CardHeader>
        <CardContent>
          {!data?.me ? <div className="text-zinc-500">Ładowanie…</div> : (
            <ul className="space-y-1">
              <li>Godziny: <b>{data.me.hours}</b></li>
              <li>Wypłata godzinowa: <b>{data.me.hourlyPayout}</b></li>
              <li>Fixed: <b>{data.me.fixedPayout}</b></li>
              <li>Premie: <b>{data.me.bonuses}</b></li>
              <li>Razem: <b>{data.me.total}</b></li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Powiadomienia</CardTitle></CardHeader>
        <CardContent>
          {(notifications ?? []).length === 0 ? <div className="text-zinc-500">Brak</div> : (
            <ul className="space-y-2">
              {(notifications ?? []).slice(0, 6).map((n: any) => (
                <li key={n.id}>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{n.body}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
