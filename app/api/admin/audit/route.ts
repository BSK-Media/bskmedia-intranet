import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ok } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const take = Math.min(Number(new URL(req.url).searchParams.get("take") ?? 200), 500);
  const items = await prisma.auditLog.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });

  return ok(items);
}
