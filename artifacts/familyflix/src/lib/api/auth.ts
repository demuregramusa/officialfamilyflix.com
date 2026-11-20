import { site } from "@/lib/site";

export interface ApiAccess {
  keyed: boolean;
  licensed: boolean;
}

function partnerApiKeys() {
  return (process.env.DEVELOPER_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function readApiKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    return token || null;
  }
  const headerKey = request.headers.get("x-api-key")?.trim();
  return headerKey || null;
}

export function resolveApiAccess(request: Request): ApiAccess {
  const key = readApiKey(request);
  if (!key) return { keyed: false, licensed: false };
  return { keyed: true, licensed: partnerApiKeys().includes(key) };
}

export const API_ACCESS_ERROR = `That API key is not active. Request a license at ${site.contact.developers}.`;
