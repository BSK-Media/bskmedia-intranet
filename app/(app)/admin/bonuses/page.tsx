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
import { formatPLN } from "@/lib/labels";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type User = { id: string; name: string; email: string; role: "ADMIN" | "EMPLOYEE" };
type Assignment = { userId: string; projectId: string; project?: { name: string; client?: { name: string } } };
type Bonus = {
  id: string;
  userId: string;
  projectId: string | null;
  amount: number;
  type: "ONE_OFF" | "MONTHLY";
  month: string | null;
  note: string | null;
  user?: { name: string; email: string };
  project?: { id: string; name: string; client?: { name: string } };
};

export default function BonusesPage() {
  const { data, mutate } = useSWR<Bonus[]>("/api/admin/bonuses", fetcher);
  const { data: users } = useSWR<User[]>("/api/admin/users", fetcher);
  const { data: assignments } = useSWR<Assignment[]>("/api/admin/assignments", fetcher);
  const [editing, setEditing] = React.useState<Bonus | null>(null);

  const columns: ColumnDef<Bonus, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name ?? "" },
    {
      header: "Projekt",
      cell: ({ row }) => {
        const p = row.original.project;
        if (!p) return row.original.projectId ? "(usuniety)" : "—";
        const client = (p as any)?.client?.name;
        return client ? `${client} — ${p.name}` : p.name;
      },
    },
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

  // Some existing databases may have workers mistakenly created with role=ADMIN.
  // We primarily want to exclude real admins from receiving bonuses, but keep the UI usable.
  const nonAdmins = (users ?? []).filter((u) => u.role !== "ADMIN");
  const employees = nonAdmins.length ? nonAdmins : (users ?? []);

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
              assignments={assignments ?? []}
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
                assignments={assignments ?? []}
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
  assignments,
  initial,
  onSubmit,
}: {
  users: User[];
  assignments: Assignment[];
  initial?: Partial<Bonus>;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [userId, setUserId] = React.useState(initial?.userId ?? "");
  const [projectId, setProjectId] = React.useState(initial?.projectId ?? "");
  const [amount, setAmount] = React.useState(String(initial?.amount ?? ""));
  const [month, setMonth] = React.useState(initial?.month ?? new Date().toISOString().slice(0, 7));
  const [note, setNote] = React.useState(initial?.note ?? "");

  const availableProjects = React.useMemo(() => {
    if (!userId) return [];
    return (assignments ?? [])
      .filter((a) => a.userId === userId)
      .map((a) => ({
        projectId: a.projectId,
        label: a.project?.client?.name ? `${a.project.client.name} — ${a.project.name}` : a.project?.name ?? a.projectId,
      }));
  }, [assignments, userId]);

  React.useEffect(() => {
    // Reset project when changing employee.
    setProjectId(initial?.userId === userId ? (initial?.projectId ?? "") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Pracownik</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Wybierz</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label>Projekt (przypisany do pracownika)</Label>
        <select
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!userId}
        >
          <option value="">Wybierz</option>
          {availableProjects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.label}
            </option>
          ))}
        </select>
        {userId && availableProjects.length === 0 ? <div className="text-xs text-zinc-500">Ten pracownik nie ma przypisanych projektów.</div> : null}
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
          if (!projectId) {
            toast.error("Wybierz projekt");
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
          await onSubmit({ userId, projectId, amount: Number(amount), type: "ONE_OFF", month, note: note || null });
        }}
        disabled={!userId || !projectId}
      >
        Zapisz
      </Button>
    </div>
  );
}
