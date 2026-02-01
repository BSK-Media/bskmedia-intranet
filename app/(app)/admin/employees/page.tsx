"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AdminListPage } from "@/components/admin-list-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EmployeesPage() {
  const columns: ColumnDef<any, any>[] = [
    { header: "Imię i nazwisko", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Rola", accessorKey: "role" },
    { header: "Stawka/h", accessorKey: "hourlyRateDefault" },
  ];

  return <AdminListPage title="Pracownicy" endpoint="/api/admin/users" columns={columns} renderForm={({ onDone }: any) => <CreateUser onDone={onDone} />} />;
}

function CreateUser({ onDone }: { onDone: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");
  const [hourlyRateDefault, setHourlyRateDefault] = React.useState("0");
  const [password, setPassword] = React.useState("");

  async function submit() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, role, hourlyRateDefault: Number(hourlyRateDefault), password: password || undefined }),
    });
    if (!res.ok) return toast.error("Błąd zapisu");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1"><Label>Imię i nazwisko</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Rola</Label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Stawka/h</Label><Input value={hourlyRateDefault} onChange={(e) => setHourlyRateDefault(e.target.value)} /></div>
      </div>

      <div className="space-y-1"><Label>Hasło (opcjonalnie)</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} /></div>

      <Button onClick={submit} disabled={!name || !email}>Zapisz</Button>
    </div>
  );
}
