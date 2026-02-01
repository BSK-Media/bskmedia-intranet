import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UPSERT"
  | "EXPORT"
  | "IMPORT"
  | "OTHER";

export type AuditEntity =
  | "User"
  | "Client"
  | "Project"
  | "Goal"
  | "Assignment"
  | "Bonus"
  | "TimeEntry"
  | "Conversation"
  | "Message"
  | "Auth"
  | "System"
  | string;

export type LogAuditInput = {
  actorId?: string | null;
  action: AuditAction | string;
  entity: AuditEntity | string;
  entityId?: string | null;
  meta?: any;
};

/**
 * Writes an audit log row to the database.
 * Safe to call from API routes. Never throws for JSON meta serialization issues.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: String(input.action),
        entity: String(input.entity),
        entityId: input.entityId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (e) {
    // Intentionally swallow errors to avoid breaking the primary action.
    // eslint-disable-next-line no-console
    console.warn("Audit log write failed:", e);
  }
}

/**
 * Convenience wrapper used across the codebase.
 * Signature matches older code that called `audit(actorId, action, entity, entityId, meta)`.
 */
export type AuditFn = {
  (actorId: string | null | undefined, action: string, entity: string, entityId?: string | null, meta?: any): Promise<void>;
  logAudit: typeof logAudit;
  log: typeof logAudit;
};

export const audit: AuditFn = Object.assign(
  async (actorId: string | null | undefined, action: string, entity: string, entityId?: string | null, meta?: any) => {
    await logAudit({ actorId: actorId ?? null, action, entity, entityId: entityId ?? null, meta });
  },
  { logAudit, log: logAudit }
);

export default audit;
