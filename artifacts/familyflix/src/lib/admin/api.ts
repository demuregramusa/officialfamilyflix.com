import { NextResponse } from "next/server";

import { getSession } from "@/lib/admin-auth";
import { can, type Capability, type StaffRole } from "@/lib/admin/permissions";
import { getSettings } from "@/lib/admin/settings";
import type { AdminSessionInfo } from "@/lib/admin/movies";
import { rateLimit, rateLimitHeaders } from "@/lib/api/rate-limit";

const TEN_MINUTES = 10 * 60 * 1000;

interface StaffAuthSuccess {
  session: AdminSessionInfo;
  response?: never;
}

interface StaffAuthFailure {
  session?: never;
  response: NextResponse;
}

export async function requireStaffApi(
  capability: Capability,
  request?: Request,
): Promise<StaffAuthSuccess | StaffAuthFailure> {
  const session = await getSession();
  if (!session) {
    return {
      response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }),
    };
  }

  if (!can(session.user.role, capability)) {
    return {
      response: NextResponse.json(
        {
          error:
            "Your role does not allow this action. Ask an administrator if you need access.",
          code: "forbidden",
        },
        { status: 403 },
      ),
    };
  }

  const role = session.user.role as StaffRole;

  if (request && role === "moderator") {
    const settings = await getSettings();
    const isImport = capability === "tmdb.import";
    const isWrite = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const shouldLimit = isImport || isWrite;

    if (shouldLimit) {
      const group = isImport ? "imports" : "writes";
      const limit = isImport
        ? settings.moderation.importsPer10Minutes
        : settings.moderation.writesPer10Minutes;
      const result = rateLimit(`staff:${session.user.id}:${group}`, limit, TEN_MINUTES);

      if (!result.allowed) {
        const minutes = Math.max(
          1,
          Math.ceil((result.resetAt - Date.now()) / 60_000),
        );
        return {
          response: NextResponse.json(
            {
              error: `Moderator rate limit reached. Try again in about ${minutes} minute${
                minutes === 1 ? "" : "s"
              }.`,
              code: "rate_limited",
            },
            { status: 429, headers: rateLimitHeaders(result) },
          ),
        };
      }
    }
  }

  // The IP is intentionally not part of the key; staff limits follow the account.
  return {
    session: {
      userId: session.user.id,
      email: session.user.email,
      role,
    },
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the submitted fields.";
}
