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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  hourlyRateDefault?: number | null;
  availability?: "AVAILABLE" | "VACATION" | "SICK";
};

export default function EmployeesPage() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<User[]>("/api/admin/users", fetcher);
  const [editing, setEditing] = React.useState<User | null>(null);

  const columns: ColumnDef<User, any>[] = [
    { header: "Imię i nazwisko", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Rola", accessorKey: "role" },
    { header: "Stawka/h", accessorKey: "hourlyRateDefault" },
    {
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.role === "EMPLOYEE" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const res = await fetch("/api/admin/impersonation", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ userId: row.original.id }),
                });
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					toast.error(data?.message ?? "Nie udało się uruchomić podglądu");
					return;
				}
				router.push("/me");
              }}
            >
              Podgląd
            </Button>
          ) : null}

          <Button variant="outline" size="sm" onClick={() => setEditing(row.original)}>
            Edytuj
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm(`Usunąć użytkownika „${row.original.name}”?`)) return;
              const res = await fetch(`/api/admin/users?id=${encodeURIComponent(row.original.id)}`, { method: "DELETE" });
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					toast.error(data?.message || "Nie udało się usunąć");
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pracownicy</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Dodaj</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj użytkownika</DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={async (payload) => {
                const res = await fetch("/api/admin/users", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload),
                });
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					toast.error(data?.message || "Błąd zapisu");
					return;
				}
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
              <DialogTitle>Edytuj użytkownika</DialogTitle>
            </DialogHeader>
            {editing ? (
              <UserForm
                initial={editing}
                onSubmit={async (payload) => {
                  const res = await fetch("/api/admin/users", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ ...payload, id: editing.id }),
                  });
					const data = await res.json().catch(() => ({}));
					if (!res.ok) {
						toast.error(data?.message || "Błąd zapisu");
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

function UserForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<User>;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [role, setRole] = React.useState<User["role"]>((initial?.role as any) ?? "EMPLOYEE");
  const [hourlyRateDefault, setHourlyRateDefault] = React.useState(String(initial?.hourlyRateDefault ?? 0));
  const [availability, setAvailability] = React.useState<User["availability"]>((initial?.availability as any) ?? "AVAILABLE");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Imię i nazwisko</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Rola</Label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Stawka/h</Label>
          <Input value={hourlyRateDefault} onChange={(e) => setHourlyRateDefault(e.target.value)} inputMode="numeric" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Status dostępności</Label>
        <Select value={availability} onValueChange={(v) => setAvailability(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
            <SelectItem value="VACATION">VACATION</SelectItem>
            <SelectItem value="SICK">SICK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Hasło (opcjonalnie)</Label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial?.id ? "Zostaw puste aby nie zmieniać" : ""} />
      </div>

      <Button
        onClick={async () => {
          setSaving(true);
          try {
            await onSubmit({
              name,
              email,
              role,
              hourlyRateDefault: Number(hourlyRateDefault || 0),
              availability,
              ...(password ? { password } : {}),
            });
          } finally {
            setSaving(false);
          }
        }}
        disabled={!name || !email || saving}
      >
        {saving ? "Zapisywanie…" : "Zapisz"}
      </Button>
    </div>
  );
}
