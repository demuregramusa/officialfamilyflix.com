import jwt from "jsonwebtoken";

const API_BASE = "https://api.cloudflare.com/client/v4";

export function cloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN,
  );
}

export function cloudflareSigningConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID &&
      process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
  );
}

function accountId() {
  const value = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!value) throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
  return value;
}

function apiToken() {
  const value = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!value) throw new Error("CLOUDFLARE_STREAM_API_TOKEN is not configured.");
  return value;
}

async function cloudflareFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/accounts/${accountId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    success?: boolean;
    result?: T;
    errors?: { message?: string }[];
  };

  if (!response.ok || payload.success === false || payload.result === undefined) {
    const message =
      payload.errors?.map((error) => error.message).filter(Boolean).join(", ") ||
      `Cloudflare Stream request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload.result;
}

export interface CloudflareUpload {
  uid: string;
  uploadURL: string;
}

export async function createDirectUpload(input: {
  name: string;
  movieId: string;
}): Promise<CloudflareUpload> {
  return cloudflareFetch<CloudflareUpload>("/stream/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds: 14400,
      requireSignedURLs: cloudflareSigningConfigured(),
      meta: {
        name: input.name.slice(0, 120),
        movieId: input.movieId,
      },
    }),
  });
}

export interface CloudflareAsset {
  uid: string;
  status?: { state?: string; errorReasonCode?: string; errorReasonText?: string };
  readyToStream?: boolean;
  duration?: number;
  size?: number;
  thumbnail?: string;
  playback?: { hls?: string; dash?: string };
  input?: { width?: number; height?: number };
  requireSignedURLs?: boolean;
}

export async function getCloudflareAsset(uid: string): Promise<CloudflareAsset> {
  return cloudflareFetch<CloudflareAsset>(`/stream/${encodeURIComponent(uid)}`);
}

export async function deleteCloudflareAsset(uid: string) {
  await cloudflareFetch(`/stream/${encodeURIComponent(uid)}`, { method: "DELETE" });
}

export function mapCloudflareStatus(asset: CloudflareAsset) {
  if (asset.readyToStream || asset.status?.state === "ready") return "ready" as const;
  if (asset.status?.state === "error") return "error" as const;
  return "processing" as const;
}

function signingKey() {
  const raw = process.env.CLOUDFLARE_STREAM_SIGNING_KEY;
  if (!raw) throw new Error("CLOUDFLARE_STREAM_SIGNING_KEY is not configured.");
  return raw.replace(/\\n/g, "\n");
}

export function signPlaybackToken(videoUid: string, ttlSeconds = 7200) {
  const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  if (!keyId) throw new Error("CLOUDFLARE_STREAM_SIGNING_KEY_ID is not configured.");

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: videoUid,
      kid: keyId,
      nbf: now - 30,
      exp: now + ttlSeconds,
    },
    signingKey(),
    { algorithm: "RS256", keyid: keyId },
  );
}

export function signedPlaybackUrl(hlsUrl: string, videoUid: string) {
  const token = signPlaybackToken(videoUid);
  const separator = hlsUrl.includes("?") ? "&" : "?";
  return `${hlsUrl}${separator}token=${encodeURIComponent(token)}`;
}
