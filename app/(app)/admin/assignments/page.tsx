"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AssignmentsPage() {
  const { data } = useSWR("/api/admin/assignments", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name },
    { header: "Projekt", cell: ({ row }) => row.original.project?.name },
    { header: "Klient", cell: ({ row }) => row.original.project?.client?.name },
    { header: "Stawka override", accessorKey: "hourlyRateOverride" },
    { header: "Fixed payout", accessorKey: "fixedPayoutAmount" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Przypisania</CardTitle></CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}
