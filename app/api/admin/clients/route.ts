import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { clientSchema } from "@/lib/validators";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return ok(clients);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const parsed = clientSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Niepoprawne dane", { issues: parsed.error.issues });

    const created = await prisma.client.create({ data: { name: parsed.data.name } });
    await audit(auth.user.id, "CREATE", "Client", created.id, { name: created.name });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
