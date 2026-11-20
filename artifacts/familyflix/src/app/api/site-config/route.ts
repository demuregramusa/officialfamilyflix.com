import { NextResponse } from "next/server";

import { getPublicSiteConfig } from "@/lib/admin/settings";

export async function GET() {
  const config = await getPublicSiteConfig();
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
    },
  });
}

export const dynamic = "force-dynamic";
