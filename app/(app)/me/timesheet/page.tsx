"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MyTimesheet() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data, mutate } = useSWR(`/api/me/time-entries?month=${month}`, fetcher);
  const { data: projects } = useSWR("/api/me/projects", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Data", cell: ({ row }) => row.original.date?.slice(0, 10) },
    { header: "Projekt", cell: ({ row }) => row.original.project?.name },
    {
      header: "Czas",
      cell: ({ row }) => {
        const hrs = Number(row.original.hours || 0);
        const totalMinutes = Math.round(hrs * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}:${m.toString().padStart(2, "0")}`;
      },
    },
    { header: "Status", accessorKey: "status" },
    { header: "Notatka", accessorKey: "note" },
    {
      header: "Akcje",
      cell: ({ row }) => (
        <Button
          variant="outline"
          onClick={async () => {
            const okConfirm = window.confirm("Usunąć ten wpis czasu pracy?");
            if (!okConfirm) return;
            const res = await fetch(`/api/me/time-entries?id=${row.original.id}`, { method: "DELETE" });
            if (!res.ok) {
              toast.error("Nie udało się usunąć");
              return;
            }
            toast.success("Usunięto");
            mutate();
          }}
        >
          Usuń
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mój timesheet</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={month} onChange={(e) => setMonth(e.target.value)} className="w-[120px]" />
          <Dialog>
            <DialogTrigger asChild><Button>Dodaj wpis</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nowy wpis</DialogTitle></DialogHeader>
              <CreateEntry projects={projects ?? []} onDone={() => mutate()} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}

function CreateEntry({ projects, onDone }: { projects: any[]; onDone: () => void }) {
  const [projectId, setProjectId] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = React.useState("1");
  const [minutes, setMinutes] = React.useState("0");
  const [note, setNote] = React.useState("");

  async function submit() {
    const h = Number(hours || 0);
    const m = Number(minutes || 0);
    const total = h + Math.min(Math.max(m, 0), 59) / 60;
    const res = await fetch("/api/me/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, date, hours: total, note }),
    });
    if (!res.ok) return toast.error("Błąd");
    toast.success("Dodano");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Projekt</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Wybierz</option>
          {projects.map((p: any) => (
            <option key={p.projectId} value={p.projectId}>
              {p.client ? `${p.client} — ` : ""}{p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Data</Label><Input value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1">
          <Label>Czas (h / min)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Godziny" />
            <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minuty" />
          </div>
        </div>
      </div>
      <div className="space-y-1"><Label>Notatka</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <Button onClick={submit} disabled={!projectId}>Zapisz</Button>
    </div>
  );
}
