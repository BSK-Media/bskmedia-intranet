"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MyProjectsPage() {
  const { data } = useSWR("/api/me/projects", fetcher);

  const rows = data?.projects ?? [];

  const columns: ColumnDef<any, any>[] = [
    { header: "Projekt", accessorKey: "name" },
    { header: "Klient", accessorKey: "client" },
    { header: "Godziny (miesiąc)", accessorKey: "hoursApproved" },
    { header: "Efektywność/h", accessorKey: "efficiencyPerHour" },
    { header: "Premia", accessorKey: "bonus" },
    {
      id: "payType",
      header: "Wynagrodzenie",
      cell: ({ row }) => {
        const a = row.original;
        if (a.fixedPayoutAmount) return `Projektowe (${a.fixedPayoutAmount} zł)`;
        if (a.hourlyRateOverride) return `Godzinowe (${a.hourlyRateOverride} zł/h)`;
        return "Godzinowe (domyślna stawka)";
      },
    },
    { header: "Wynagrodzenie (miesiąc)", accessorKey: "payout" },
    { header: "Status", accessorKey: "status" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/me/projects/${row.original.projectId}`}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          Szczegóły
        </Link>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Moje projekty</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-2 text-xs text-zinc-500">Widok dotyczy miesiąca: <b>{data?.month ?? ""}</b> (APPROVED)</div>
        <DataTable data={rows} columns={columns} />
      </CardContent>
    </Card>
  );
}
