import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { badRequest } from "@/lib/http";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const status = new URL(req.url).searchParams.get("status") ?? undefined;

  const rows = await prisma.timeEntry.findMany({
    where: status ? { status: status as any } : undefined,
    include: { user: { select: { name: true, email: true } }, project: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 1000,
  });

  if (!rows) return badRequest("Brak danych");

  const csv = toCsv(
    rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      user: r.user.name,
      email: r.user.email,
      project: r.project.name,
      hours: Number(r.hours),
      status: r.status,
      note: r.note ?? "",
    })),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="timesheet.csv"`,
    },
  });
}
