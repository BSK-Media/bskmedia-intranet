"use client";

import * as React from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Client = {
  id: string;
  name: string;
  note?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export default function ClientsPage() {
  const { data, mutate, isLoading } = useSWR<Client[]>("/api/admin/clients", fetcher);
  const [editing, setEditing] = React.useState<Client | null>(null);

  const columns: ColumnDef<Client, any>[] = [
    { header: "Nazwa", accessorKey: "name" },
    { header: "Kontakt (email)", accessorKey: "contactEmail" },
    { header: "Telefon", accessorKey: "contactPhone" },
    {
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(row.original)}>
            Edytuj
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm(`Usunąć klienta „${row.original.name}”?`)) return;
              const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(row.original.id)}`, { method: "DELETE" });
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
        <CardTitle>Klienci</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Dodaj</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj klienta</DialogTitle>
            </DialogHeader>
            <ClientForm
              onSubmit={async (payload) => {
                const res = await fetch("/api/admin/clients", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) return toast.error("Błąd zapisu");
                toast.success("Zapisano");
                await mutate();
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="text-zinc-500">Ładowanie…</div> : <DataTable data={data ?? []} columns={columns} />}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj klienta</DialogTitle>
            </DialogHeader>
            {editing ? (
              <ClientForm
                initial={editing}
                onSubmit={async (payload) => {
                  const res = await fetch("/api/admin/clients", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ ...payload, id: editing.id }),
                  });
                  if (!res.ok) return toast.error("Błąd zapisu");
                  toast.success("Zapisano");
                  setEditing(null);
                  await mutate();
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ClientForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<Client>;
  onSubmit: (payload: Partial<Client>) => Promise<void>;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [contactName, setContactName] = React.useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = React.useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = React.useState(initial?.contactPhone ?? "");
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Klient Gamma" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Osoba kontaktowa (opcjonalnie)</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Email kontaktowy (opcjonalnie)</Label>
          <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Telefon (opcjonalnie)</Label>
        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label>Notatka (opcjonalnie)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </div>

      <Button
        onClick={async () => {
          setSaving(true);
          try {
            await onSubmit({
              name,
              contactName: contactName || null,
              contactEmail: contactEmail || null,
              contactPhone: contactPhone || null,
              note: note || null,
            });
          } finally {
            setSaving(false);
          }
        }}
        disabled={!name || saving}
      >
        {saving ? "Zapisywanie…" : "Zapisz"}
      </Button>
    </div>
  );
}
