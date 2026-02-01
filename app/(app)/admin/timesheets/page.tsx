"use client";

import * as React from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function TimesheetsPage() {
  const [status, setStatus] = React.useState<"SUBMITTED" | "APPROVED" | "REJECTED">("SUBMITTED");
  const { data, mutate } = useSWR(`/api/admin/time-entries?status=${status}`, fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Data", cell: ({ row }) => row.original.date?.slice(0, 10) },
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name },
    { header: "Projekt", cell: ({ row }) => row.original.project?.name },
    { header: "Godziny", cell: ({ row }) => Number(row.original.hours) },
    { header: "Status", accessorKey: "status" },
    {
      header: "Akcje",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => review(row.original.id, "APPROVED")}>Approve</Button>
          <Button variant="outline" onClick={() => review(row.original.id, "REJECTED")}>Reject</Button>
        </div>
      ),
    },
  ];

  async function review(id: string, s: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/admin/time-entries", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: s }) });
    if (!res.ok) {
      toast.error("Błąd");
      return;
    }
    toast.success("Zapisano");
    mutate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timesheet (weryfikacja)</CardTitle>
        <div className="w-[220px]">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable data={data ?? []} columns={columns} />
        <div className="mt-4 text-xs text-zinc-500">
          Eksport CSV: <a className="underline" href="/api/admin/export/timesheet">/api/admin/export/timesheet</a>
        </div>
      </CardContent>
    </Card>
  );
}
