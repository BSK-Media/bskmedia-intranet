"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function GoalsPage() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data } = useSWR("/api/admin/goals?month=" + month, fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name },
    { header: "Miesiąc", accessorKey: "month" },
    { header: "Cel godzin", accessorKey: "targetHours" },
    { header: "Bonus", accessorKey: "bonusAmount" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cele KPI</CardTitle>
        <div className="w-[180px]"><Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" /></div>
      </CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}
