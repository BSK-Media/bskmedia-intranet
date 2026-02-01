import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok } from "@/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id!;
  const items = await prisma.bonus.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return ok(items);
}
