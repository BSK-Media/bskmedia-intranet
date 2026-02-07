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
import { formatPLN } from "@/lib/labels";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type User = { id: string; name: string; email: string; role: "ADMIN" | "EMPLOYEE" };
type Bonus = { id: string; userId: string; amount: number; type: "ONE_OFF" | "MONTHLY"; month: string | null; note: string | null; user?: { name: string; email: string } };

export default function BonusesPage() {
  const { data, mutate } = useSWR<Bonus[]>("/api/admin/bonuses", fetcher);
  const { data: users } = useSWR<User[]>("/api/admin/users", fetcher);
  const [editing, setEditing] = React.useState<Bonus | null>(null);

  const columns: ColumnDef<Bonus, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name ?? "" },
    { header: "Kwota", cell: ({ row }) => formatPLN(Number(row.original.amount ?? 0)) },
    { header: "Miesiąc", accessorKey: "month" },
    { header: "Za co", accessorKey: "note" },
    {
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(row.original)}>
            Edytuj
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("Usunąć premię?")) return;
              const res = await fetch(`/api/admin/bonuses?id=${encodeURIComponent(row.original.id)}`, { method: "DELETE" });
              const payload = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast.error(payload?.message ?? "Nie udało się usunąć");
                return;
              }
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

  const employees = (users ?? []).filter((u) => u.role === "EMPLOYEE");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Premie</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Dodaj premię</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj premię</DialogTitle>
            </DialogHeader>
            <BonusForm
              users={employees}
              onSubmit={async (payload) => {
                const res = await fetch("/api/admin/bonuses", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data?.message ?? "Błąd zapisu");
                  return;
                }
                toast.success("Dodano premię");
                await mutate();
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable data={data ?? []} columns={columns} />

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj premię</DialogTitle>
            </DialogHeader>
            {editing ? (
              <BonusForm
                users={employees}
                initial={editing}
                onSubmit={async (payload) => {
                  const res = await fetch("/api/admin/bonuses", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ ...payload, id: editing.id }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(data?.message ?? "Błąd zapisu");
                    return;
                  }
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

function BonusForm({
  users,
  initial,
  onSubmit,
}: {
  users: User[];
  initial?: Partial<Bonus>;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [userId, setUserId] = React.useState(initial?.userId ?? "");
  const [amount, setAmount] = React.useState(String(initial?.amount ?? ""));
  const [month, setMonth] = React.useState(initial?.month ?? new Date().toISOString().slice(0, 7));
  const [note, setNote] = React.useState(initial?.note ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Pracownik</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz" />
          </SelectTrigger>
          <SelectContent disablePortal>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Kwota</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="np. 500" />
        </div>
        <div className="space-y-1">
          <Label>Miesiąc (YYYY-MM)</Label>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Za co</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. premia za termin" />
      </div>
      <Button
        onClick={async () => {
          if (!userId) {
            toast.error("Wybierz pracownika");
            return;
          }
          if (!/^-?\d+(\.\d+)?$/.test(amount || "")) {
            toast.error("Podaj poprawną kwotę");
            return;
          }
          if (!/^\d{4}-\d{2}$/.test(month || "")) {
            toast.error("Miesiąc ma format YYYY-MM");
            return;
          }
          await onSubmit({ userId, amount: Number(amount), type: "ONE_OFF", month, note: note || null });
        }}
        disabled={!userId}
      >
        Zapisz
      </Button>
    </div>
  );
}
