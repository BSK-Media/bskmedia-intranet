// lib/audit.ts
//
// This module supports two import styles used across the codebase:
// 1) import { logAudit } from "@/lib/audit"
// 2) import { audit } from "@/lib/audit"
//
// Both are provided below for compatibility.

import prisma from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "LOGIN"
  | "LOGOUT"
  | "OTHER";

export type AuditEntity =
  | "USER"
  | "CLIENT"
  | "PROJECT"
  | "ASSIGNMENT"
  | "TIME_ENTRY"
  | "BONUS"
  | "GOAL"
  | "CONVERSATION"
  | "MESSAGE"
  | "SYSTEM";

export interface LogAuditInput {
  actorId?: string | null;
  action: AuditAction;
  entity: AuditEntity | string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

/**
 * Persist an audit log entry.
 *
 * IMPORTANT: Errors are swallowed to avoid breaking API routes.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action as any,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[audit] failed to log audit event", err);
  }
}

/**
 * Compatibility wrapper used in many routes: `audit.logAudit(...)` or `audit.log(...)`.
 */
export const audit = {
  logAudit,
  log: logAudit,
};

// Backwards-compatible alias (in case other modules use a different name)
export const writeAudit = logAudit;

export default audit;
