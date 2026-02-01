import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { projectSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const projects = await prisma.project.findMany({
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
      } as any,
    });

    await audit(auth.user.id, "CREATE", "Project", created.id, { name: created.name });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
