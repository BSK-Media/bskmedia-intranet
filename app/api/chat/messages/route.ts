import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) return badRequest("conversationId required");

  const allowed = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!allowed) return badRequest("Brak dostępu");

  const msgs = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return ok(msgs);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  try {
    const body = await req.json();
    const conversationId = body?.conversationId as string | undefined;
    const text = (body?.text as string | undefined)?.trim();
    if (!conversationId || !text) return badRequest("Niepoprawne dane");

    const allowed = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!allowed) return badRequest("Brak dostępu");

    const created = await prisma.message.create({
      data: { conversationId, senderId: userId, body: text },
    });

    await audit(userId, "CREATE", "Message", created.id, { conversationId });
    return ok(created, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
