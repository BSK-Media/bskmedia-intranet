"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AuditPage() {
  const { data } = useSWR("/api/admin/audit?take=200", fetcher);

  const columns: ColumnDef<any, any>[] = [
    { header: "Kiedy", cell: ({ row }) => row.original.createdAt?.slice(0, 19).replace("T", " ") },
    { header: "Aktor", cell: ({ row }) => row.original.actor?.name ?? row.original.actor?.email ?? "" },
    { header: "Akcja", accessorKey: "action" },
    { header: "Encja", accessorKey: "entity" },
    { header: "ID", accessorKey: "entityId" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
      <CardContent>
        <DataTable data={data ?? []} columns={columns} />
      </CardContent>
    </Card>
  );
}
