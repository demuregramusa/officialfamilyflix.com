import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { getSettings, saveSettings } from "@/lib/admin/settings";

export async function GET(request: Request) {
  const auth = await requireStaffApi("settings.view", request);
  if (auth.response) return auth.response;

  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const auth = await requireStaffApi("settings.manage", request);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const result = await saveSettings(payload, auth.session);
  if (!result.ok) return jsonError(result.error);

  return NextResponse.json({ settings: result.settings });
}

export const dynamic = "force-dynamic";
