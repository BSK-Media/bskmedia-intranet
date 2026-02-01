import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { timeEntryCreateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

    const userId = auth.user.id;
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  let from: Date | undefined;
  let to: Date | undefined;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0, 23, 59, 59);
  }

  const items = await prisma.timeEntry.findMany({
    where: { userId, ...(from && to ? { date: { gte: from, lte: to } } : {}) },
    include: { project: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 400,
  });

  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;

  try {
    const parsed = timeEntryCreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const created = await prisma.timeEntry.create({
      data: {
        userId,
        projectId: parsed.data.projectId,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        note: parsed.data.note ?? null,
        status: "SUBMITTED",
      },
    });

    await audit(userId, "CREATE", "TimeEntry", created.id, { projectId: created.projectId, hours: created.hours });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Brak id");

  try {
    const te = await prisma.timeEntry.findUnique({ where: { id } });
    if (!te || te.userId !== userId) return badRequest("Nie znaleziono");

    if (te.status !== "SUBMITTED") return badRequest("Nie można usunąć po akceptacji/odrzuceniu");

    await prisma.timeEntry.delete({ where: { id } });
    await audit(userId, "DELETE", "TimeEntry", id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
