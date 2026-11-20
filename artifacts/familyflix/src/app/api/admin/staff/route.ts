import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/movies";
import { listStaff } from "@/lib/admin/staff";
import { staffCreateSchema } from "@/lib/admin/validation";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const authInfo = await requireStaffApi("staff.manage", request);
  if (authInfo.response) return authInfo.response;

  const staff = await listStaff();
  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const authInfo = await requireStaffApi("staff.manage", request);
  if (authInfo.response) return authInfo.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = staffCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  let created;
  try {
    created = await auth.api.createUser({
      body: {
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
        name: parsed.data.name,
        // Better Auth types this against adminRoles, but the runtime accepts
        // any staff role. Permissions are enforced by our capability layer.
        role: parsed.data.role as "admin",
      },
      headers: await headers(),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "body" in error
        ? ((error as { body?: { message?: string } }).body?.message ?? null)
        : null;
    return jsonError(
      message ??
        (error instanceof Error
          ? error.message
          : "Could not create the staff account."),
      400,
    );
  }

  await logAudit(authInfo.session, "staff.create", "staff", created.user.id, {
    email: created.user.email,
    role: parsed.data.role,
  });

  return NextResponse.json(
    {
      staff: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        role: parsed.data.role,
        banned: false,
        banReason: null,
        createdAt: new Date(),
      },
    },
    { status: 201 },
  );
}

export const dynamic = "force-dynamic";
