import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { ok } from "@/lib/http";

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
    convs.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      lastMessage: c.messages[0] ? { body: c.messages[0].body, createdAt: c.messages[0].createdAt } : null,
      participants: c.participants.map((p) => p.user),
    })),
  );
}
