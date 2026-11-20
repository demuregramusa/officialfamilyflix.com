import type { AssetKind, LicenseType, RightsInput } from "@workspace/api-zod";
import type { RequestSession } from "./auth-middleware";
import { mediaRights, type MediaRight } from "@workspace/db";

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
  if (/\.torrent$/i.test(parsed.pathname) || /magnet|torrent/i.test(parsed.protocol)) {
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
  movieId: string,
  session: RequestSession,
) {
  return {
    movieId,
    assetKind: assetToDb[input.assetKind] as (typeof mediaRights.$inferInsert)["assetKind"],
    assetLabel: input.assetLabel.trim(),
    assetUrl: input.assetUrl.trim(),
    rightsHolder: input.rightsHolder.trim(),
    creatorAttribution: input.creatorAttribution.trim(),
    licenseType: licenseToDb[input.licenseType] as (typeof mediaRights.$inferInsert)["licenseType"],
    licenseVersion: input.licenseVersion.trim(),
    licenseUrl: input.licenseUrl.trim(),
    usageRestrictions: input.usageRestrictions.map((restriction) => restriction.trim()).filter(Boolean),
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
  if (record.licenseType === "unlicensed") return false;
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
