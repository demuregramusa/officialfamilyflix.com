import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  can,
  isStaffRole,
  type Capability,
  type StaffRole,
} from "@/lib/admin/permissions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

type StaffSession = NonNullable<Awaited<ReturnType<typeof getSession>>> & {
  user: { role: StaffRole };
};

export async function getStaffSession(): Promise<StaffSession> {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    redirect("/auth/sign-in?redirectTo=/admin");
  }
  return session as StaffSession;
}

export async function getAdminSession() {
  const session = await getStaffSession();
  if (session.user.role !== "admin") {
    redirect("/admin?denied=admin-only");
  }
  return session;
}

export async function requireStaffPage(capability: Capability) {
  const session = await getStaffSession();
  if (!can(session.user.role, capability)) {
    redirect(`/admin?denied=${encodeURIComponent(capability)}`);
  }
  return session;
}

export async function hasAdmin() {
  const [adminUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);
  return Boolean(adminUser);
}
