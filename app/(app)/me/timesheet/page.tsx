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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MyTimesheet() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data, mutate } = useSWR(`/api/me/time-entries?month=${month}`, fetcher);
  const { data: projects } = useSWR("/api/me/projects", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Data", cell: ({ row }) => row.original.date?.slice(0, 10) },
    { header: "Projekt", cell: ({ row }) => row.original.project?.name },
    { header: "Godziny", cell: ({ row }) => Number(row.original.hours) },
    { header: "Status", accessorKey: "status" },
    { header: "Notatka", accessorKey: "note" },
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
  const [note, setNote] = React.useState("");

  async function submit() {
    const res = await fetch("/api/me/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, date, hours: Number(hours), note }),
    });
    if (!res.ok) return toast.error("Błąd");
    toast.success("Dodano");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Projekt</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
          <SelectContent>
            {projects.map((p: any) => <SelectItem key={p.projectId} value={p.projectId}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Data</Label><Input value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1"><Label>Godziny</Label><Input value={hours} onChange={(e) => setHours(e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label>Notatka</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <Button onClick={submit} disabled={!projectId}>Zapisz</Button>
    </div>
  );
}
