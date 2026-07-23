import { db } from "@/db";
import { auditLog, type AuditAction } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";

/**
 * Records one audit-log entry. Never throws — a failure to log must not
 * block the primary operation (create/update/delete) that triggered it.
 */
export async function logAudit(params: {
  session: SessionPayload;
  action: AuditAction;
  module: string;
  entityId?: number | null;
  entityLabel?: string;
  details?: string;
}) {
  try {
    await db.insert(auditLog).values({
      userId: params.session.uid,
      userName: params.session.name,
      action: params.action,
      module: params.module,
      entityId: params.entityId ?? null,
      entityLabel: params.entityLabel ?? "",
      details: params.details ?? "",
    });
  } catch (err) {
    console.error("[audit] failed to record entry", err);
  }
}
