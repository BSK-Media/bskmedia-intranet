// lib/audit.ts
// Callable audit helper + explicit exports.
// Patch: LogAuditInput supports both `entity` and legacy `entityType` fields.

import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

export type LogAuditInput = {
  actorId?: string | null;
  action: AuditAction | string;
  /** Preferred: model/entity name, e.g. "Project" */
  entity?: string;
  /** Backward-compat alias used in some routes (e.g. login) */
  entityType?: string;
  entityId?: string | null;
  meta?: any;
};

async function logAuditImpl(input: LogAuditInput): Promise<void> {
  const entity = input.entity ?? input.entityType ?? "Unknown";
  const action = input.action as AuditAction;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action,
        entity,
        entityId: input.entityId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (e) {
    // audit must never break API
    console.error("[audit] failed", e);
  }
}

/**
 * Callable form used in many routes:
 * await audit(actorId, "UPSERT", "Assignment", id, meta)
 */
export async function audit(
  actorId: string | null | undefined,
  action: AuditAction | string,
  entity: string,
  entityId?: string | null,
  meta?: any
): Promise<void> {
  return logAuditImpl({ actorId: actorId ?? null, action, entity, entityId: entityId ?? null, meta });
}

// Also provide object-style + named export for clarity
export const logAudit = logAuditImpl;
export const auditApi = {
  logAudit: logAuditImpl,
  log: logAuditImpl,
};

// For backwards imports:
// import { audit } from "@/lib/audit" (callable)
// import { logAudit } from "@/lib/audit" (object literal input)
// import auditDefault from "@/lib/audit" (callable with props)

// Attach methods to callable function so `audit.log(...)` works too
(audit as any).logAudit = logAuditImpl;
(audit as any).log = logAuditImpl;

export default audit;
