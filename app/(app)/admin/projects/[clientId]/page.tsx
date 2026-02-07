"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { billingLabel, cadenceLabel, statusLabel } from "@/lib/labels";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AdminClientProjectsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data: client } = useSWR(clientId ? `/api/admin/clients?clientId=${clientId}` : null, fetcher);
  const { data: projects, mutate } = useSWR(clientId ? `/api/admin/projects?clientId=${clientId}&month=${month}` : null, fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Projekt", accessorKey: "name" },
    { header: "Billing", cell: ({ row }) => billingLabel(row.original.billingType) },
    { header: "Cykliczność", cell: ({ row }) => cadenceLabel(row.original.cadence) },
    { header: "Status", cell: ({ row }) => statusLabel(row.original.status) },
    { header: "Deadline", cell: ({ row }) => (row.original.deadlineAt ? row.original.deadlineAt.slice(0, 10) : "—") },
    {
      id: "actions",
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ProjectDialog
            trigger={<Button variant="outline" size="sm">Edytuj</Button>}
            mode="edit"
            clientId={clientId}
            project={row.original}
            onDone={mutate}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("Usunąć projekt?")) return;
              const res = await fetch(`/api/admin/projects/${row.original.id}`, { method: "DELETE" });
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
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/admin/projects" className="text-sm text-zinc-500 hover:underline">Projekty</Link>
              <span className="text-sm text-zinc-400">/</span>
              <span>{client?.name ?? "Klient"}</span>
            </div>
          </CardTitle>
          <div className="text-xs text-zinc-500">Filtruj po miesiącu (YYYY-MM). Projekty jednorazowe liczymy po deadline.</div>
        </div>

        <div className="flex items-center gap-2">
          <Input value={month} onChange={(e) => setMonth(e.target.value)} className="w-[120px]" />
          <ProjectDialog
            trigger={<Button>Dodaj projekt</Button>}
            mode="create"
            clientId={clientId}
            onDone={mutate}
          />
        </div>
      </CardHeader>
      <CardContent>
        <DataTable data={projects ?? []} columns={columns} />
      </CardContent>
    </Card>
  );
}

function ProjectDialog({
  trigger,
  mode,
  clientId,
  project,
  onDone,
}: {
  trigger: React.ReactNode;
  mode: "create" | "edit";
  clientId: string;
  project?: any;
  onDone: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Dodaj projekt" : "Edytuj projekt"}</DialogTitle>
        </DialogHeader>
        <ProjectForm
          mode={mode}
          clientId={clientId}
          project={project}
          onDone={async () => {
            await onDone();
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ mode, clientId, project, onDone }: { mode: "create" | "edit"; clientId: string; project?: any; onDone: () => void }) {
  const [name, setName] = React.useState(project?.name ?? "");
  const [billingType, setBillingType] = React.useState<"FIXED" | "HOURLY" | "MONTHLY_RETAINER">(project?.billingType ?? "HOURLY");
  const [cadence, setCadence] = React.useState<"ONE_OFF" | "RECURRING_MONTHLY">(project?.cadence ?? "ONE_OFF");
  const [status, setStatus] = React.useState<"ACTIVE" | "PAUSED" | "DONE">(project?.status ?? "ACTIVE");

  const [hourlyClientRate, setHourlyClientRate] = React.useState(project?.hourlyClientRate?.toString() ?? "");
  const [fixedClientPrice, setFixedClientPrice] = React.useState(project?.fixedClientPrice?.toString() ?? "");
  const [monthlyRetainerAmount, setMonthlyRetainerAmount] = React.useState(project?.monthlyRetainerAmount?.toString() ?? "");

  const [contractStart, setContractStart] = React.useState((project?.contractStart ?? new Date().toISOString()).slice(0, 10));
  const [contractEnd, setContractEnd] = React.useState(project?.contractEnd ? project.contractEnd.slice(0, 10) : "");
  const [deadlineAt, setDeadlineAt] = React.useState(project?.deadlineAt ? project.deadlineAt.slice(0, 10) : "");

  async function submit() {
    const payload: any = {
      name,
      clientId,
      billingType,
      cadence,
      status,
      tags: project?.tags ?? [],
      contractStart: contractStart ? `${contractStart}T00:00:00.000Z` : null,
      contractEnd: contractEnd ? `${contractEnd}T00:00:00.000Z` : null,
      deadlineAt: deadlineAt ? `${deadlineAt}T00:00:00.000Z` : null,
    };
    if (hourlyClientRate) payload.hourlyClientRate = Number(hourlyClientRate);
    if (fixedClientPrice) payload.fixedClientPrice = Number(fixedClientPrice);
    if (monthlyRetainerAmount) payload.monthlyRetainerAmount = Number(monthlyRetainerAmount);

    const url = mode === "create" ? "/api/admin/projects" : `/api/admin/projects/${project.id}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) return toast.error("Błąd zapisu");
    toast.success("Zapisano");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Billing</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value as any)}
          >
            <option value="HOURLY">Godzinowo</option>
            <option value="FIXED">Projektowo</option>
            <option value="MONTHLY_RETAINER">Abonament miesięczny</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="ACTIVE">Aktywny</option>
            <option value="PAUSED">Wstrzymany</option>
            <option value="DONE">Zakończony</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Cykliczność</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as any)}
        >
          <option value="ONE_OFF">Jednorazowo</option>
          <option value="RECURRING_MONTHLY">Co miesiąc</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Stawka klienta (godzinowo)</Label>
          <Input value={hourlyClientRate} onChange={(e) => setHourlyClientRate(e.target.value)} placeholder="np. 150" />
        </div>
        <div className="space-y-1">
          <Label>Kwota projektu (projektowo)</Label>
          <Input value={fixedClientPrice} onChange={(e) => setFixedClientPrice(e.target.value)} placeholder="np. 2500" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Abonament miesięczny (kwota)</Label>
        <Input value={monthlyRetainerAmount} onChange={(e) => setMonthlyRetainerAmount(e.target.value)} placeholder="np. 400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Start kontraktu</Label>
          <Input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Koniec kontraktu (opcjonalnie)</Label>
          <Input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Deadline projektu (ważne dla jednorazowych)</Label>
        <Input type="date" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} />
      </div>

      <Button onClick={submit} disabled={!name}>Zapisz</Button>
    </div>
  );
}
