import { and, desc, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export const ACTION_LABELS: Record<string, string> = {
  "movie.create": "created a title",
  "movie.update": "updated a title",
  "movie.delete": "deleted a title",
  "movie.import": "imported titles",
  "stream.attach": "attached a stream",
  "stream.direct_upload": "started an upload",
  "stream.sync": "synced a stream",
  "stream.remove": "removed a stream",
  "subtitle.save": "saved a subtitle track",
  "subtitle.delete": "deleted a subtitle track",
  "settings.update": "updated site settings",
  "staff.create": "created a staff account",
  "staff.role": "changed a staff role",
  "staff.ban": "suspended a staff account",
  "staff.unban": "restored a staff account",
  "staff.delete": "deleted a staff account",
  "staff.password": "reset a staff password",
};

export function auditLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: Date;
}

export async function listAudit(options: {
  query?: string;
  action?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  const filters = [];
  if (options.action) filters.push(ilike(auditLogs.action, `%${options.action}%`));
  if (options.query) {
    const term = `%${options.query}%`;
    filters.push(or(ilike(auditLogs.userEmail, term), ilike(auditLogs.action, term)));
  }

  return db
    .select()
    .from(auditLogs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(options.limit ?? 150, 300));
}

export function summarizeDetail(detail: Record<string, unknown> | null) {
  if (!detail) return "";
  const parts = Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => {
      const rendered =
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : JSON.stringify(value);
      return `${key}: ${rendered}`;
    });
  return parts.join(" · ");
}
