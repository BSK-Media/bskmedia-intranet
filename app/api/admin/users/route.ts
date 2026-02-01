import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { userSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return ok(users);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = userSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const password = parsed.data.password ?? "ChangeMe123!";
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        hourlyRateDefault: parsed.data.hourlyRateDefault,
        availability: parsed.data.availability ?? "AVAILABLE",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    await audit(auth.session.user.id, "CREATE", "User", created.id, { email: created.email, role: created.role });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
