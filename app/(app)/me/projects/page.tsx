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
    { header: "Billing", accessorKey: "billingType" },
    { header: "Status", accessorKey: "status" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Moje projekty</CardTitle></CardHeader>
      <CardContent><DataTable data={data ?? []} columns={columns} /></CardContent>
    </Card>
  );
}
