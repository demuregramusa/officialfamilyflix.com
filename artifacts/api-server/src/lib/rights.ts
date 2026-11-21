import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { AssetKind, LicenseType, RightsInput } from "@workspace/api-zod";
import type { RequestSession } from "./auth-middleware";
import type { mediaRights, MediaRight } from "@workspace/db";

const sourceProbeTimeoutMs = 5_000;
const sourceDnsTimeoutMs = 3_000;
const sourceRedirectLimit = 3;

export interface MediaSourceProbeResponse {
  status: number;
  contentType: string | null;
  location: string | null;
}

export interface MediaSourceProbeTransport {
  resolve(hostname: string): Promise<string[]>;
  request(url: URL, address: string): Promise<MediaSourceProbeResponse>;
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  const [first, second, third] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second! >= 64 && second! <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first! >= 224
  );
}

export function isPublicMediaSourceAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !isPrivateOrReservedIpv4(address);
  if (version === 6) {
    let normalized = address.toLowerCase();
    const embeddedIpv4 = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (embeddedIpv4) {
      const octets = embeddedIpv4[1]!.split(".").map(Number);
      const high = ((octets[0]! << 8) | octets[1]!).toString(16);
      const low = ((octets[2]! << 8) | octets[3]!).toString(16);
      normalized = normalized.replace(embeddedIpv4[1]!, `${high}:${low}`);
    }
    const [left, right = ""] = normalized.split("::");
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const zeroCount = 8 - leftGroups.length - rightGroups.length;
    const groups = normalized.includes("::")
      ? [...leftGroups, ...Array.from({ length: zeroCount }, () => "0"), ...rightGroups]
      : leftGroups;
    const firstGroup = Number.parseInt(groups[0] ?? "", 16);
    const secondGroup = Number.parseInt(groups[1] ?? "", 16);
    // Only accept global unicast addresses. This excludes loopback, link-local,
    // unique-local, IPv4-mapped, and other non-public IPv6 ranges.
    if (firstGroup < 0x2000 || firstGroup > 0x3fff) return false;
    return !(
      firstGroup === 0x2002 ||
      (firstGroup === 0x2001 && [0x0000, 0x0002, 0x0010, 0x0020, 0x0db8].includes(secondGroup))
    );
  }
  return false;
}

function validateDirectMediaSourceUrl(value: string, type: "mp4" | "hls"): URL | string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter a valid HTTPS media source URL.";
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".invalid")
  ) {
    return "Playback sources must use public HTTPS addresses without credentials or custom ports.";
  }
  if (value.length > 2048) return "Playback source URLs cannot exceed 2,048 characters.";
  if (!url.pathname.toLowerCase().endsWith(type === "hls" ? ".m3u8" : ".mp4")) {
    return `The ${type.toUpperCase()} URL must end in .${type === "hls" ? "m3u8" : "mp4"}.`;
  }
  return url;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const defaultMediaSourceProbeTransport: MediaSourceProbeTransport = {
  async resolve(hostname) {
    if (isIP(hostname)) return [hostname];
    const addresses = await withTimeout(
      dnsLookup(hostname, { all: true, verbatim: true }),
      sourceDnsTimeoutMs,
      "The source host lookup timed out.",
    );
    return addresses.map(({ address }) => address);
  },
  request(url, address) {
    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        {
          hostname: address,
          servername: url.hostname.replace(/^\[|\]$/g, ""),
          port: 443,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          agent: false,
          headers: {
            host: url.host,
            range: "bytes=0-0",
            accept: "video/mp4, application/vnd.apple.mpegurl, application/x-mpegURL",
            "user-agent": "DemureGram-media-source-check/1.0",
          },
        },
        (response) => {
          const result = {
            status: response.statusCode ?? 0,
            contentType: typeof response.headers["content-type"] === "string"
              ? response.headers["content-type"]
              : null,
            location: typeof response.headers.location === "string"
              ? response.headers.location
              : null,
          };
          response.destroy();
          resolve(result);
        },
      );
      request.setTimeout(sourceProbeTimeoutMs, () => {
        request.destroy(new Error("The source response timed out."));
      });
      request.once("error", reject);
      request.end();
    });
  },
};

export async function checkDirectMediaSource(
  value: string,
  type: "mp4" | "hls",
  transport: MediaSourceProbeTransport = defaultMediaSourceProbeTransport,
): Promise<string | null> {
  let currentUrl = validateDirectMediaSourceUrl(value, type);
  if (typeof currentUrl === "string") return currentUrl;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const hostname = currentUrl.hostname.replace(/^\[|\]$/g, "");
    let addresses: string[];
    try {
      addresses = await transport.resolve(hostname);
    } catch {
      return "The media source host could not be resolved.";
    }
    if (!addresses.length || addresses.some((address) => !isPublicMediaSourceAddress(address))) {
      return "The media source must resolve only to public internet addresses.";
    }

    let result: MediaSourceProbeResponse;
    try {
      // Pin the request to a checked IP so a DNS change cannot redirect the
      // connection to a private or link-local address after validation.
      result = await transport.request(currentUrl, addresses[0]!);
    } catch {
      return "The media source could not be reached within the allowed time.";
    }

    if ([301, 302, 303, 307, 308].includes(result.status)) {
      if (!result.location || redirectCount >= sourceRedirectLimit) {
        return "The media source redirected too many times or omitted its redirect target.";
      }
      let redirectedUrl: URL;
      try {
        redirectedUrl = new URL(result.location, currentUrl);
      } catch {
        return "The media source returned an invalid redirect.";
      }
      const redirectValidation = validateDirectMediaSourceUrl(redirectedUrl.href, type);
      if (typeof redirectValidation === "string") return "The media source redirected to an unsupported or unsafe URL.";
      currentUrl = redirectValidation;
      continue;
    }

    if (result.status < 200 || result.status >= 300) {
      return `The media source returned HTTP ${result.status}.`;
    }
    const contentType = result.contentType?.split(";", 1)[0]?.trim().toLowerCase();
    const validTypes = type === "mp4"
      ? ["video/mp4"]
      : [
          "application/vnd.apple.mpegurl",
          "application/x-mpegurl",
          "audio/mpegurl",
          "audio/x-mpegurl",
        ];
    if (!contentType || !validTypes.includes(contentType)) {
      return `The media source did not return a supported ${type.toUpperCase()} media type.`;
    }
    return null;
  }
}

export async function checkManualMediaSource(
  input: { mp4Url?: string | null; hlsUrl?: string | null },
  transport: MediaSourceProbeTransport = defaultMediaSourceProbeTransport,
): Promise<string | null> {
  const urls = [input.mp4Url, input.hlsUrl].filter((value): value is string => Boolean(value));
  if (urls.length !== 1) return "Provide exactly one direct MP4 or HLS source.";
  const publicUrlIssue = validatePublicHttpUrl(urls[0]!);
  if (publicUrlIssue) return publicUrlIssue;
  const type = input.hlsUrl ? "hls" : "mp4";
  return checkDirectMediaSource(urls[0]!, type, transport);
}

const licenseToDb: Record<LicenseType, string> = {
  "cc-by-4.0": "cc_by_4_0",
  "cc-by-sa-4.0": "cc_by_sa_4_0",
  "cc-by-nd-4.0": "cc_by_nd_4_0",
  "cc-by-nc-4.0": "cc_by_nc_4_0",
  "cc-by-nc-sa-4.0": "cc_by_nc_sa_4_0",
  "cc-by-nc-nd-4.0": "cc_by_nc_nd_4_0",
  "cc0-1.0": "cc0_1_0",
  "public-domain": "public_domain",
  "creator-owned": "owned",
  "authorized-copyright": "authorized",
  unlicensed: "unlicensed",
};

const licenseFromDb: Record<string, LicenseType> = Object.fromEntries(
  Object.entries(licenseToDb).map(([api, database]) => [database, api]),
) as Record<string, LicenseType>;

const assetToDb: Record<AssetKind, string> = {
  "main-video": "main_video",
  poster: "poster",
  backdrop: "backdrop",
  photo: "photo",
  artwork: "artwork",
  audio: "audio",
  subtitle: "subtitle",
  other: "other",
};

const assetFromDb: Record<string, AssetKind> = Object.fromEntries(
  Object.entries(assetToDb).map(([api, database]) => [database, api]),
) as Record<string, AssetKind>;

const canonicalCreativeCommonsUrls: Partial<Record<LicenseType, string>> = {
  "cc-by-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "cc-by-sa-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "cc-by-nd-4.0": "https://creativecommons.org/licenses/by-nd/4.0/",
  "cc-by-nc-4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "cc-by-nc-sa-4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "cc-by-nc-nd-4.0": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "cc0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
};

const licenseRestrictions: Partial<Record<LicenseType, string[]>> = {
  "cc-by-4.0": ["Attribution required"],
  "cc-by-sa-4.0": ["Attribution required", "Adaptations must use the same license"],
  "cc-by-nd-4.0": ["Attribution required", "No derivatives"],
  "cc-by-nc-4.0": ["Attribution required", "NonCommercial use only"],
  "cc-by-nc-sa-4.0": [
    "Attribution required",
    "NonCommercial use only",
    "Adaptations must use the same license",
  ],
  "cc-by-nc-nd-4.0": [
    "Attribution required",
    "NonCommercial use only",
    "No derivatives",
  ],
};

export function validatePublicHttpUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a valid HTTP or HTTPS URL.";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Only direct HTTP or HTTPS media sources are accepted.";
  }
  if (parsed.username || parsed.password) {
    return "Media URLs cannot contain embedded credentials.";
  }
  if (
    /\.torrent$/i.test(parsed.pathname) ||
    /magnet|torrent/i.test(`${parsed.protocol}${parsed.hostname}${parsed.pathname}${parsed.search}`)
  ) {
    return "Torrent and magnet sources are not accepted.";
  }
  return null;
}

export function validateRightsInput(input: RightsInput): string | null {
  const urlFields = [
    ["media", input.assetUrl],
    ["original source", input.sourceUrl],
    ["permission evidence", input.evidenceUrl],
  ] as const;
  for (const [label, value] of urlFields) {
    const issue = validatePublicHttpUrl(value);
    if (issue) return `${label}: ${issue}`;
  }

  const expectedLicenseUrl = canonicalCreativeCommonsUrls[input.licenseType];
  if (expectedLicenseUrl && input.licenseUrl !== expectedLicenseUrl) {
    return "The license URL must match the selected Creative Commons license and version.";
  }
  const licenseUrlIssue = validatePublicHttpUrl(input.licenseUrl);
  if (licenseUrlIssue) return `License URL: ${licenseUrlIssue}`;
  if (input.licenseType.startsWith("cc-") && input.licenseVersion !== input.licenseType.slice(-3)) {
    return "The Creative Commons license version must match the selected license.";
  }
  if (input.licenseType === "cc0-1.0" && input.licenseVersion !== "1.0") {
    return "CC0 must use version 1.0.";
  }
  if (
    (input.licenseType === "creator-owned" ||
      input.licenseType === "authorized-copyright" ||
      input.licenseType === "public-domain") &&
    !input.evidenceNotes?.trim()
  ) {
    return "Add a note identifying the basis for this rights claim.";
  }
  return null;
}

export function rightsToInsert(
  input: RightsInput,
  movieId: string | null,
  session: RequestSession,
  episodeId: string | null = null,
) {
  return {
    movieId,
    episodeId,
    assetKind: assetToDb[input.assetKind] as (typeof mediaRights.$inferInsert)["assetKind"],
    assetLabel: input.assetLabel.trim(),
    assetUrl: input.assetUrl.trim(),
    rightsHolder: input.rightsHolder.trim(),
    creatorAttribution: input.creatorAttribution.trim(),
    licenseType: licenseToDb[input.licenseType] as (typeof mediaRights.$inferInsert)["licenseType"],
    licenseVersion: input.licenseVersion.trim(),
    licenseUrl: input.licenseUrl.trim(),
    usageRestrictions: [...new Set([
      ...input.usageRestrictions.map((restriction) => restriction.trim()).filter(Boolean),
      ...(licenseRestrictions[input.licenseType] ?? []),
    ])],
    sourceUrl: input.sourceUrl.trim(),
    evidenceUrl: input.evidenceUrl.trim(),
    evidenceNotes: input.evidenceNotes?.trim() || null,
    territory: input.territory?.trim() || null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    uploaderAttested: true,
    uploaderId: session.user.id,
    submittedAt: new Date(),
    reviewStatus: "pending" as const,
  };
}

export function rightsFromDb(record: MediaRight) {
  return {
    id: record.id,
    assetKind: assetFromDb[record.assetKind] ?? "other",
    assetLabel: record.assetLabel,
    assetUrl: record.assetUrl,
    rightsHolder: record.rightsHolder,
    creatorAttribution: record.creatorAttribution,
    licenseType: licenseFromDb[record.licenseType] ?? "unlicensed",
    licenseVersion: record.licenseVersion,
    licenseUrl: record.licenseUrl,
    usageRestrictions: record.usageRestrictions,
    sourceUrl: record.sourceUrl,
    evidenceUrl: record.evidenceUrl,
    evidenceNotes: record.evidenceNotes,
    territory: record.territory,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    uploaderAttested: record.uploaderAttested,
    reviewStatus: record.reviewStatus.replaceAll("_", "-"),
    submittedAt: record.submittedAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    reviewedBy: record.reviewedBy,
    reviewNotes: record.reviewNotes,
  };
}

export function isRightCurrent(record: Pick<MediaRight, "expiresAt" | "reviewStatus" | "uploaderAttested">) {
  return (
    record.reviewStatus === "approved" &&
    record.uploaderAttested &&
    (!record.expiresAt || record.expiresAt.getTime() > Date.now())
  );
}

export function isEvidenceComplete(record: MediaRight): boolean {
  if (!record.uploaderAttested || !record.rightsHolder.trim() || !record.creatorAttribution.trim()) {
    return false;
  }
  if (!record.sourceUrl || !record.evidenceUrl || !record.licenseUrl || !record.licenseVersion) {
    return false;
  }
  const publicLicenseType = licenseFromDb[record.licenseType];
  if (!publicLicenseType || publicLicenseType === "unlicensed") return false;
  const expectedLicenseUrl = canonicalCreativeCommonsUrls[publicLicenseType];
  if (expectedLicenseUrl && record.licenseUrl !== expectedLicenseUrl) return false;
  if (
    publicLicenseType.startsWith("cc-") &&
    record.licenseVersion !== publicLicenseType.slice(-3)
  ) return false;
  if (publicLicenseType === "cc0-1.0" && record.licenseVersion !== "1.0") return false;
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
