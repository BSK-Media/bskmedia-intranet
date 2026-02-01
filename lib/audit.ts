import { prisma } from "@/lib/db";

export async function audit(actorId: string | undefined, action: string, entity: string, entityId?: string, meta?: any) {
  if (!actorId) return;
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta } });
  } catch {
    // best-effort
  }
}
