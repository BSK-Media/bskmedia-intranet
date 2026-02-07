import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { projectSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const month = url.searchParams.get("month") ?? undefined;

  let monthFrom: Date | undefined;
  let monthTo: Date | undefined;
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return badRequest("month=YYYY-MM");
    }
    const [y, m] = month.split("-").map(Number);
    monthFrom = new Date(y, m - 1, 1);
    monthTo = new Date(y, m, 0, 23, 59, 59);
  }

  const where: any = {};
  if (clientId) where.clientId = clientId;

  if (monthFrom && monthTo) {
    where.OR = [
      // projekty cykliczne (umowa obejmuje miesiąc)
      {
        cadence: "RECURRING_MONTHLY",
        contractStart: { lte: monthTo },
        OR: [{ contractEnd: null }, { contractEnd: { gte: monthFrom } }],
      },
      // projekty jednorazowe (miesiąc deadline lub, gdy brak deadline, miesiąc utworzenia)
      {
        cadence: "ONE_OFF",
        OR: [
          { deadlineAt: { gte: monthFrom, lte: monthTo } },
          { deadlineAt: null, createdAt: { gte: monthFrom, lte: monthTo } },
        ],
      },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(projects);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = projectSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const created = await prisma.project.create({
      data: {
        ...parsed.data,
        monthlyRetainerAmount: parsed.data.monthlyRetainerAmount ?? null,
        fixedClientPrice: parsed.data.fixedClientPrice ?? null,
        hourlyClientRate: parsed.data.hourlyClientRate ?? null,
        completedAt: parsed.data.status === "DONE" ? new Date() : null,
        contractStart: parsed.data.contractStart ? new Date(parsed.data.contractStart) : new Date(),
        contractEnd: parsed.data.contractEnd ? new Date(parsed.data.contractEnd) : null,
        deadlineAt: parsed.data.deadlineAt ? new Date(parsed.data.deadlineAt) : null,
      } as any,
    });

    await audit(auth.user.id, "CREATE", "Project", created.id, { name: created.name });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
