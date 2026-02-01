import { NextResponse } from "next/server";
import { clearAuthCookie, getAuthUser } from "@/lib/auth-cookie";
import { clearImpersonationCookie } from "@/lib/effective-auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getAuthUser();
  clearAuthCookie();
  // also clear impersonation if present
  clearImpersonationCookie();
  if (user?.id) await logAudit({ actorId: user.id, action: "AUTH_LOGOUT", entityType: "User", entityId: user.id });
  return NextResponse.json({ ok: true });
}
