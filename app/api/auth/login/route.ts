import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signAuthToken } from "@/lib/auth-cookie";
import { logAudit } from "@/lib/audit";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const token = await signAuthToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
  });

  setAuthCookie(token);
  // Keep AuditAction aligned with the Prisma enum (see prisma/schema.prisma)
  await logAudit({ actorId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
