import type { RequestSession } from "./auth-middleware";
import { auditLogs, db } from "@workspace/db";

export async function logAudit(
  session: RequestSession | null,
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {},
) {
  await db.insert(auditLogs).values({
    userId: session?.user.id ?? null,
    userEmail: session?.user.email ?? null,
    action,
    entity,
    entityId,
    detail,
  });
}
