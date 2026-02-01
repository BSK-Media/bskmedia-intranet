import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok, badRequest, serverError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  const convs = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    convs.map((c) => {
      const participants = c.participants.map((p) => p.user);
      const other = participants.find((p) => p.id !== userId);
      return {
        id: c.id,
        type: c.type,
        // For DIRECT conversations, show the other person's name by default.
        name: c.name ?? (c.type === "DIRECT" ? other?.name ?? other?.email ?? "Rozmowa" : "Grupa"),
        lastMessage: c.messages[0] ? { body: c.messages[0].body, createdAt: c.messages[0].createdAt } : null,
        participants,
      };
    }),
  );
}

// Create (or reuse) a DIRECT conversation with another user.
// Body: { participantId: string }
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;
  try {
    const body = await req.json();
    const participantId = body?.participantId as string | undefined;
    if (!participantId) return badRequest("participantId required");
    if (participantId === userId) return badRequest("Nie można utworzyć rozmowy z samym sobą");

    const other = await prisma.user.findUnique({ where: { id: participantId }, select: { id: true } });
    if (!other) return badRequest("Użytkownik nie istnieje");

    // Try to find an existing DIRECT conversation with exactly these two users.
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        participants: {
          every: { userId: { in: [userId, participantId] } },
        },
      },
      include: { participants: true },
    });

    if (existing && existing.participants.length === 2) {
      return ok({ id: existing.id }, { status: 200 });
    }

    const created = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [{ userId }, { userId: participantId }],
        },
      },
    });

    await audit(userId, "CREATE", "Conversation", created.id, { type: "DIRECT", participantId });
    return ok({ id: created.id }, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message ?? "Błąd");
  }
}
