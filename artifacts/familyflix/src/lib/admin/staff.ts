import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import type { AdminSessionInfo } from "@/lib/admin/movies";
import { logAudit } from "@/lib/admin/movies";
import { isStaffRole, type StaffRole } from "@/lib/admin/permissions";
import { db } from "@/lib/db";
import { session as sessionTable, user } from "@/lib/db/auth-schema";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
}

export type StaffMutationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function listStaff(): Promise<StaffMember[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(inArray(user.role, ["admin", "moderator"]))
    .orderBy(asc(user.role), asc(user.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: isStaffRole(row.role) ? row.role : "moderator",
    banned: Boolean(row.banned),
    banReason: row.banReason,
    createdAt: row.createdAt,
  }));
}

async function activeAdminCount(excludeId?: string) {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(user)
    .where(
      and(
        eq(user.role, "admin"),
        sql`${user.banned} is not true`,
        excludeId ? ne(user.id, excludeId) : undefined,
      ),
    );
  return row?.total ?? 0;
}

async function getStaffTarget(targetId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);
  return row ?? null;
}

function isTargetAdmin(role: string | null) {
  return role === "admin";
}

export async function setStaffRole(
  actor: AdminSessionInfo,
  targetId: string,
  role: StaffRole,
): Promise<StaffMutationResult> {
  const target = await getStaffTarget(targetId);
  if (!target || !isStaffRole(target.role)) {
    return { ok: false, error: "Staff member not found.", status: 404 };
  }
  if (target.id === actor.userId) {
    return { ok: false, error: "You cannot change your own role.", status: 400 };
  }
  if (target.role === role) return { ok: true };

  if (isTargetAdmin(target.role) && (await activeAdminCount(target.id)) < 1) {
    return {
      ok: false,
      error: "Add another active administrator before changing this one.",
      status: 409,
    };
  }

  await db.update(user).set({ role }).where(eq(user.id, targetId));
  await logAudit(actor, "staff.role", "staff", targetId, {
    email: target.email,
    from: target.role,
    to: role,
  });
  return { ok: true };
}

export async function setStaffBan(
  actor: AdminSessionInfo,
  targetId: string,
  banned: boolean,
  reason?: string,
): Promise<StaffMutationResult> {
  const target = await getStaffTarget(targetId);
  if (!target || !isStaffRole(target.role)) {
    return { ok: false, error: "Staff member not found.", status: 404 };
  }
  if (target.id === actor.userId) {
    return {
      ok: false,
      error: "You cannot suspend your own account.",
      status: 400,
    };
  }
  if (banned && isTargetAdmin(target.role) && (await activeAdminCount(target.id)) < 1) {
    return {
      ok: false,
      error: "Add another active administrator before suspending this one.",
      status: 409,
    };
  }

  await db
    .update(user)
    .set({
      banned,
      banReason: banned ? reason?.trim() || "Suspended by an administrator." : null,
      banExpires: null,
    })
    .where(eq(user.id, targetId));

  if (banned) {
    await db.delete(sessionTable).where(eq(sessionTable.userId, targetId));
  }

  await logAudit(actor, banned ? "staff.ban" : "staff.unban", "staff", targetId, {
    email: target.email,
    reason: banned ? reason?.trim() || null : null,
  });
  return { ok: true };
}

export async function setStaffPassword(
  actor: AdminSessionInfo,
  targetId: string,
  newPassword: string,
): Promise<StaffMutationResult> {
  const target = await getStaffTarget(targetId);
  if (!target || !isStaffRole(target.role)) {
    return { ok: false, error: "Staff member not found.", status: 404 };
  }

  try {
    await auth.api.setUserPassword({
      body: { userId: targetId, newPassword },
      headers: await headers(),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "body" in error
        ? ((error as { body?: { message?: string } }).body?.message ?? null)
        : null;
    return {
      ok: false,
      error:
        message ??
        (error instanceof Error
          ? error.message
          : "Could not update the password."),
      status: 400,
    };
  }

  await logAudit(actor, "staff.password", "staff", targetId, {
    email: target.email,
  });

  return { ok: true };
}

export async function deleteStaff(
  actor: AdminSessionInfo,
  targetId: string,
): Promise<StaffMutationResult> {
  const target = await getStaffTarget(targetId);
  if (!target || !isStaffRole(target.role)) {
    return { ok: false, error: "Staff member not found.", status: 404 };
  }
  if (target.id === actor.userId) {
    return { ok: false, error: "You cannot delete your own account.", status: 400 };
  }
  if (isTargetAdmin(target.role) && (await activeAdminCount(target.id)) < 1) {
    return {
      ok: false,
      error: "Add another active administrator before deleting this one.",
      status: 409,
    };
  }

  await db.delete(user).where(eq(user.id, targetId));
  await logAudit(actor, "staff.delete", "staff", targetId, {
    email: target.email,
    role: target.role,
  });
  return { ok: true };
}
