const API_BASE = "https://api.cloudflare.com/client/v4";

export interface CloudflareUpload {
  uid: string;
  uploadURL: string;
}

export interface CloudflareAsset {
  uid: string;
  status?: { state?: string; errorReasonCode?: string; errorReasonText?: string };
  readyToStream?: boolean;
  duration?: number;
  size?: number;
  thumbnail?: string;
  playback?: { hls?: string };
  input?: { width?: number; height?: number };
}

function configuration() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Stream is not configured. Add its account ID and API token in Replit Secrets.");
  }
  return { accountId, token };
}

async function requestCloudflare<T>(path: string, init?: RequestInit): Promise<T> {
  const { accountId, token } = configuration();
  const response = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json() as {
    success?: boolean;
    result?: T;
    errors?: { message?: string }[];
  };
  if (!response.ok || payload.success !== true || payload.result === undefined) {
    const message = payload.errors?.map((entry) => entry.message).filter(Boolean).join(", ");
    throw new Error(message || `Cloudflare Stream request failed (${response.status}).`);
  }
  return payload.result;
}

export function cloudflareConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN);
}

export async function createCloudflareUpload(input: {
  titleName: string;
  titleId: string;
}): Promise<CloudflareUpload> {
  return requestCloudflare<CloudflareUpload>("/stream/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds: 14400,
      requireSignedURLs: false,
      meta: { name: input.titleName.slice(0, 120), movieId: input.titleId },
    }),
  });
}

export function getCloudflareAsset(uid: string) {
  return requestCloudflare<CloudflareAsset>(`/stream/${encodeURIComponent(uid)}`);
}

export function mapCloudflareStatus(asset: CloudflareAsset) {
  if (asset.readyToStream || asset.status?.state === "ready") return "ready" as const;
  if (asset.status?.state === "error") return "error" as const;
  return "processing" as const;
}
