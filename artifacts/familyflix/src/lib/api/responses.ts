import { NextResponse } from "next/server";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "X-API-Key, Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function jsonError(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "no-store", ...CORS_HEADERS, ...headers },
    },
  );
}
