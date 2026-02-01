import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok } from "@/lib/http";

// Returns a list of users that the current user can start a DIRECT chat with.
// - ADMIN: returns EMPLOYEE users
// - EMPLOYEE: returns ADMIN users
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const me = auth.user;
  const targetRole = me.role === "ADMIN" ? "EMPLOYEE" : "ADMIN";

  const users = await prisma.user.findMany({
    where: { role: targetRole },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return ok(users);
}
