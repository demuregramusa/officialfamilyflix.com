import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import {
  deleteStaff,
  setStaffBan,
  setStaffPassword,
  setStaffRole,
} from "@/lib/admin/staff";
import { staffUpdateSchema } from "@/lib/admin/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("staff.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = staffUpdateSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  let result;
  if (parsed.data.action === "role") {
    if (!parsed.data.role) return jsonError("Choose a role.");
    result = await setStaffRole(auth.session, id, parsed.data.role);
  } else if (parsed.data.action === "ban") {
    result = await setStaffBan(auth.session, id, true, parsed.data.reason);
  } else if (parsed.data.action === "password") {
    if (!parsed.data.password) return jsonError("Enter a new password.");
    result = await setStaffPassword(auth.session, id, parsed.data.password);
  } else {
    result = await setStaffBan(auth.session, id, false);
  }

  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("staff.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await deleteStaff(auth.session, id);
  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
