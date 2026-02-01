import { NextResponse } from "next/server";
import { clearAuthCookie, getAuthUser } from "@/lib/auth-cookie";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getAuthUser();
  clearAuthCookie();
  // Keep Prisma enum compatibility: use built-in AuditAction values.
  if (user?.id) await logAudit({ actorId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id });
  return NextResponse.json({ ok: true });
}
