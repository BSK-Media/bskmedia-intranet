"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MyProjectsPage() {
  const { data } = useSWR("/api/me/projects", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Projekt", accessorKey: "name" },
    { header: "Klient", accessorKey: "client" },
    {
      header: "Wynagrodzenie",
      cell: ({ row }) => {
        const a = row.original;
        if (a.fixedPayoutAmount) return `Projektowe (${a.fixedPayoutAmount} zł)`;
        if (a.hourlyRateOverride) return `Godzinowe (${a.hourlyRateOverride} zł/h)`;
        return "Godzinowe (domyślna stawka)";
      },
    },
    { header: "Status", accessorKey: "status" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Moje projekty</CardTitle></CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}
