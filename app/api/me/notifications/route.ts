import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id!;
  const items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return ok(items);
}

export async function PATCH(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id!;
  try {
    const body = await req.json();
    const id = body?.id as string | undefined;
    if (!id) return badRequest("Brak id");
    await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
