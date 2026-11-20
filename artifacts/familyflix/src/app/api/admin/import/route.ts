import { NextResponse } from "next/server";
import { z } from "zod";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import {
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  ImportError,
  importTitles,
  templateCsv,
  templateJson,
} from "@/lib/admin/import";

const importSchema = z.object({
  text: z.string().min(1, "Paste a CSV or JSON file first."),
  dryRun: z.boolean().optional(),
  updateExisting: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireStaffApi("library.import", request);
  if (auth.response) return auth.response;

  return NextResponse.json({
    columns: IMPORT_COLUMNS,
    limits: IMPORT_LIMITS,
    template: templateCsv(),
    jsonTemplate: templateJson(),
  });
}

export async function POST(request: Request) {
  const auth = await requireStaffApi("library.import", request);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = importSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  try {
    const report = await importTitles({
      text: parsed.data.text,
      session: auth.session,
      dryRun: parsed.data.dryRun,
      updateExisting: parsed.data.updateExisting,
    });
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof ImportError) return jsonError(error.message);
    return jsonError(
      error instanceof Error ? error.message : "The import could not be processed.",
      500,
    );
  }
}

export const dynamic = "force-dynamic";
