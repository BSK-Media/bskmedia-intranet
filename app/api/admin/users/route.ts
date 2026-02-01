import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { userSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const userUpdateSchema = userSchema.extend({ id: z.string().min(1) }).partial({ password: true });

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

    await audit(auth.user.id, "CREATE", "User", created.id, { email: created.email, role: created.role });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const { id, password, ...rest } = parsed.data as any;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: rest.name,
        email: rest.email?.toLowerCase(),
        role: rest.role,
        hourlyRateDefault: rest.hourlyRateDefault,
        availability: rest.availability ?? undefined,
        ...(password ? { passwordHash: await bcrypt.hash(String(password), 10) } : {}),
      },
    });

    await audit(auth.user.id, "UPDATE", "User", updated.id, { email: updated.email, role: updated.role });
    return ok(updated);
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) return badRequest("Brak id");
    if (id === auth.user.id) return badRequest("Nie możesz usunąć aktualnie zalogowanego użytkownika");

    await prisma.user.delete({ where: { id } });
    await audit(auth.user.id, "DELETE", "User", id, {});
    return ok({ ok: true });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
