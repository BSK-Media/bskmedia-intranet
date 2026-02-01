"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function BonusesPage() {
  const { data } = useSWR("/api/admin/bonuses", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Pracownik", cell: ({ row }) => row.original.user?.name },
    { header: "Kwota", accessorKey: "amount" },
    { header: "Typ", accessorKey: "type" },
    { header: "Miesiąc", accessorKey: "month" },
    { header: "Notatka", accessorKey: "note" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Premie</CardTitle></CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}
