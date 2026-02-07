"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type PayoutMode = "HOURLY" | "PROJECT";

export default function AssignmentsPage() {
  const { data: assignments, mutate } = useSWR("/api/admin/assignments", fetcher);
  const { data: users } = useSWR("/api/admin/users", fetcher);
  const { data: projects } = useSWR("/api/admin/projects", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name ?? row.original.user?.email },
    { header: "Klient", cell: ({ row }) => row.original.project?.client?.name ?? "" },
    { header: "Projekt", cell: ({ row }) => row.original.project?.name ?? "" },
    {
      header: "Wynagrodzenie",
      cell: ({ row }) => {
        const fixed = row.original.fixedPayoutAmount;
        const hourly = row.original.hourlyRateOverride;
        if (fixed) return `Projektowe: ${fixed} zł`;
        if (hourly) return `Godzinowe: ${hourly} zł/h`;
        return "Godzinowe (stawka domyślna)";
      },
    },
    {
      id: "actions",
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AssignmentDialog
            trigger={<Button variant="outline" size="sm">Edytuj</Button>}
            users={users ?? []}
            projects={projects ?? []}
            initial={row.original}
            onDone={mutate}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("Usunąć przypisanie?")) return;
              const res = await fetch(`/api/admin/assignments?userId=${row.original.userId}&projectId=${row.original.projectId}`, { method: "DELETE" });
              if (!res.ok) return toast.error("Nie udało się usunąć");
              toast.success("Usunięto");
              await mutate();
            }}
          >
            Usuń
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Przypisania</CardTitle>
        <AssignmentDialog
          trigger={<Button>Dodaj</Button>}
          users={users ?? []}
          projects={projects ?? []}
          onDone={mutate}
        />
      </CardHeader>
      <CardContent>
        <DataTable data={assignments ?? []} columns={columns} />
      </CardContent>
    </Card>
  );
}

function AssignmentDialog({
  trigger,
  users,
  projects,
  initial,
  onDone,
}: {
  trigger: React.ReactNode;
  users: any[];
  projects: any[];
  initial?: any;
  onDone: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>{initial ? "Edytuj przypisanie" : "Dodaj przypisanie"}</DialogTitle></DialogHeader>
        <AssignmentForm
          users={users}
          projects={projects}
          initial={initial}
          onDone={async () => {
            await onDone();
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignmentForm({ users, projects, initial, onDone }: { users: any[]; projects: any[]; initial?: any; onDone: () => void }) {
  const [userId, setUserId] = React.useState(initial?.userId ?? "");
  const [projectId, setProjectId] = React.useState(initial?.projectId ?? "");
  const initialMode: PayoutMode = initial?.fixedPayoutAmount ? "PROJECT" : "HOURLY";
  const [mode, setMode] = React.useState<PayoutMode>(initialMode);

  const [hourlyRateOverride, setHourlyRateOverride] = React.useState(initial?.hourlyRateOverride?.toString() ?? "");
  const [fixedPayoutAmount, setFixedPayoutAmount] = React.useState(initial?.fixedPayoutAmount?.toString() ?? "");

  async function submit() {
    const payload: any = { userId, projectId };
    if (mode === "HOURLY") {
      payload.hourlyRateOverride = hourlyRateOverride ? Number(hourlyRateOverride) : null;
      payload.fixedPayoutAmount = null;
    } else {
      payload.fixedPayoutAmount = fixedPayoutAmount ? Number(fixedPayoutAmount) : null;
      payload.hourlyRateOverride = null;
    }

    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return toast.error("Błąd zapisu");
    toast.success("Zapisano");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Pracownik</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Wybierz</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Projekt</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Wybierz</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.client?.name ?? ""} — {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Rodzaj wynagrodzenia</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={mode}
          onChange={(e) => setMode(e.target.value as PayoutMode)}
        >
          <option value="HOURLY">Godzinowe</option>
          <option value="PROJECT">Projektowe</option>
        </select>
      </div>

      {mode === "HOURLY" ? (
        <div className="space-y-1">
          <Label>Stawka godzinowa (opcjonalnie override)</Label>
          <Input value={hourlyRateOverride} onChange={(e) => setHourlyRateOverride(e.target.value)} placeholder="np. 40" />
        </div>
      ) : (
        <div className="space-y-1">
          <Label>Kwota projektowa (wypłacana zgodnie z cyklem projektu)</Label>
          <Input value={fixedPayoutAmount} onChange={(e) => setFixedPayoutAmount(e.target.value)} placeholder="np. 200" />
          <div className="text-xs text-zinc-500">
            Dla projektów jednorazowych wypłata wpada w miesiąc deadline projektu.
          </div>
        </div>
      )}

      <Button onClick={submit} disabled={!userId || !projectId}>Zapisz</Button>
    </div>
  );
}
