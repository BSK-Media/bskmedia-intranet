import { requireAdminToken } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { clearImpersonationCookie, setImpersonationCookie } from "@/lib/effective-auth";

export async function POST(req: Request) {
  const auth = await requireAdminToken();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? "");
    if (!userId) return badRequest("Brak userId");

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!target) return badRequest("Nie znaleziono użytkownika");
    if (target.role !== "EMPLOYEE") return badRequest("Możesz podglądać tylko pracowników");

    setImpersonationCookie(target.id);
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE() {
  const auth = await requireAdminToken();
  if (!auth.ok) return auth.response;
  clearImpersonationCookie();
  return ok({ ok: true });
}
