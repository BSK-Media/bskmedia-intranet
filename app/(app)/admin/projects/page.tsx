"use client";

import * as React from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";
import { AdminListPage } from "@/components/admin-list-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
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
    if (!res.ok) return toast.error("Błąd zapisu");
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
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
          <SelectContent>
            {(clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Billing</Label>
          <Select value={billingType} onValueChange={(v) => setBillingType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HOURLY">HOURLY</SelectItem>
              <SelectItem value="FIXED">FIXED</SelectItem>
              <SelectItem value="MONTHLY_RETAINER">MONTHLY_RETAINER</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="PAUSED">PAUSED</SelectItem>
              <SelectItem value="DONE">DONE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Cadence</Label>
        <Select value={cadence} onValueChange={(v) => setCadence(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ONE_OFF">ONE_OFF</SelectItem>
            <SelectItem value="RECURRING_MONTHLY">RECURRING_MONTHLY</SelectItem>
          </SelectContent>
        </Select>
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
