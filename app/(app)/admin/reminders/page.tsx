"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RemindersPage() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/admin/reminders/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ month }) });
    setLoading(false);
    if (!res.ok) {
      toast.error("Błąd");
      return;
    }
    toast.success("Wygenerowano powiadomienia");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Przypomnienia — brak godzin</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
          <Button onClick={run} disabled={loading}>{loading ? "…" : "Generuj"}</Button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generuje powiadomienia dla pracowników, którzy nie osiągnęli celu godzin w danym miesiącu.
        </p>
      </CardContent>
    </Card>
  );
}
