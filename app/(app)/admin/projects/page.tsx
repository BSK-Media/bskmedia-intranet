"use client";

import * as React from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";
import { AdminListPage } from "@/components/admin-list-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ProjectsPage() {
  const columns: ColumnDef<any, any>[] = [
    { header: "Projekt", accessorKey: "name" },
    { header: "Klient", cell: ({ row }) => row.original.client?.name ?? "" },
    { header: "Billing", accessorKey: "billingType" },
    { header: "Status", accessorKey: "status" },
  ];

  return <AdminListPage title="Projekty" endpoint="/api/admin/projects" columns={columns} renderForm={({ onDone }: any) => <CreateProject onDone={onDone} />} />;
}

function CreateProject({ onDone }: { onDone: () => void }) {
  const { data: clients } = useSWR("/api/admin/clients", fetcher);

  const [name, setName] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [billingType, setBillingType] = React.useState<"FIXED" | "HOURLY" | "MONTHLY_RETAINER">("HOURLY");
  const [cadence, setCadence] = React.useState<"ONE_OFF" | "RECURRING_MONTHLY">("ONE_OFF");
  const [status, setStatus] = React.useState<"ACTIVE" | "PAUSED" | "DONE">("ACTIVE");
  const [hourlyClientRate, setHourlyClientRate] = React.useState("");
  const [fixedClientPrice, setFixedClientPrice] = React.useState("");
  const [monthlyRetainerAmount, setMonthlyRetainerAmount] = React.useState("");

  async function submit() {
    const payload: any = { name, clientId, billingType, cadence, status, tags: [] };
    if (hourlyClientRate) payload.hourlyClientRate = Number(hourlyClientRate);
    if (fixedClientPrice) payload.fixedClientPrice = Number(fixedClientPrice);
    if (monthlyRetainerAmount) payload.monthlyRetainerAmount = Number(monthlyRetainerAmount);

    const res = await fetch("/api/admin/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      toast.error("Błąd zapisu");
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label>Klient</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Wybierz klienta</option>
          {(clients ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Billing</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value as any)}
          >
            <option value="HOURLY">HOURLY</option>
            <option value="FIXED">FIXED</option>
            <option value="MONTHLY_RETAINER">MONTHLY_RETAINER</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="DONE">DONE</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Cadence</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as any)}
        >
          <option value="ONE_OFF">ONE_OFF</option>
          <option value="RECURRING_MONTHLY">RECURRING_MONTHLY</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Stawka klienta (HOURLY)</Label>
          <Input value={hourlyClientRate} onChange={(e) => setHourlyClientRate(e.target.value)} placeholder="np. 150" />
        </div>
        <div className="space-y-1">
          <Label>Kwota FIXED</Label>
          <Input value={fixedClientPrice} onChange={(e) => setFixedClientPrice(e.target.value)} placeholder="np. 2500" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Retainer (miesięcznie)</Label>
        <Input value={monthlyRetainerAmount} onChange={(e) => setMonthlyRetainerAmount(e.target.value)} placeholder="np. 6000" />
      </div>

      <Button onClick={submit} disabled={!name || !clientId}>Zapisz</Button>
    </div>
  );
}
