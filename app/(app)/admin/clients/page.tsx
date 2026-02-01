"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AdminListPage } from "@/components/admin-list-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ClientsPage() {
  const columns: ColumnDef<any, any>[] = [
    { header: "Nazwa", accessorKey: "name" },
    { header: "ID", accessorKey: "id" },
  ];

  return (
    <AdminListPage
      title="Klienci"
      endpoint="/api/admin/clients"
      columns={columns}
      renderForm={({ onDone }: any) => <CreateClient onDone={onDone} />}
    />
  );
}

function CreateClient({ onDone }: { onDone: () => void }) {
  const [name, setName] = React.useState("");

  async function submit() {
    const res = await fetch("/api/admin/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    if (!res.ok) return toast.error("Błąd zapisu");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Klient Gamma" />
      </div>
      <Button onClick={submit}>Zapisz</Button>
    </div>
  );
}
