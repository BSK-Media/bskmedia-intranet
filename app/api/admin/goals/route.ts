import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { goalSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  const items = await prisma.employeeGoal.findMany({
    where: month ? { month } : undefined,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  });
  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = goalSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const upserted = await prisma.employeeGoal.upsert({
      where: { userId_month: { userId: parsed.data.userId, month: parsed.data.month } },
      update: {
        targetHours: parsed.data.targetHours,
        targetRevenue: parsed.data.targetRevenue ?? null,
        bonusAmount: parsed.data.bonusAmount ?? null,
      },
      create: {
        userId: parsed.data.userId,
        month: parsed.data.month,
        targetHours: parsed.data.targetHours,
        targetRevenue: parsed.data.targetRevenue ?? null,
        bonusAmount: parsed.data.bonusAmount ?? null,
      },
    });

    await audit(auth.user.id, "UPSERT", "EmployeeGoal", upserted.id, { userId: upserted.userId, month: upserted.month });
    return ok(upserted);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Brak id");

  try {
    await prisma.employeeGoal.delete({ where: { id } });
    await audit(auth.user.id, "DELETE", "EmployeeGoal", id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
