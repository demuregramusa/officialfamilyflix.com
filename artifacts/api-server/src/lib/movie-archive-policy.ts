import type { ImportedMovieRecord, ImportedTorrentRecord } from "./movie-archive-parser";
export {
  hasReviewedTorrentRights,
  isTorrentPlaybackEligible,
  isValidTorrentInfoHash,
  type TorrentRightsState,
} from "./torrent-source-policy.mjs";

export function isProtectedArchiveTarget(
  status: string,
  licenseType: string,
  hasRightsRecords: boolean,
) {
  return status !== "draft" || licenseType !== "unlicensed" || hasRightsRecords;
}

export function privateArchiveMovieDraft(record: ImportedMovieRecord) {
  return {
    slug: `yts-${record.sourceId}`,
    name: record.name,
    kind: "movie" as const,
    tagline: "Metadata-only draft; rights and media are unverified.",
    synopsis: "Imported catalog metadata is private pending independent rights and source review.",
    year: record.year,
    durationMinutes: record.runtime,
    badge: "Unverified metadata",
    status: "draft" as const,
    licenseType: "unlicensed" as const,
    posterUrl: null,
    backdropUrl: null,
    sourceUrl: null,
    updatedAt: new Date(),
  };
}

export function disabledTorrentSource(
  movieSourceId: string,
  torrent: ImportedTorrentRecord,
) {
  return {
    movieSourceId,
    sourceIndex: torrent.sourceIndex,
    sourceUrl: torrent.sourceUrl,
    infoHash: torrent.infoHash,
    quality: torrent.quality,
    sourceType: torrent.sourceType,
    isRepack: torrent.isRepack,
    videoCodec: torrent.videoCodec,
    bitDepth: torrent.bitDepth,
    audioChannels: torrent.audioChannels,
    seeders: torrent.seeders,
    peers: torrent.peers,
    size: torrent.size,
    sizeBytes: torrent.sizeBytes,
    uploadedAt: torrent.uploadedAt,
    metadata: torrent.metadata,
    playbackStatus: "disabled" as const,
    rightsStatus: "unverified" as const,
  };
}

export function toAdminTorrentSourceView(source: {
  id: string;
  infoHash: string | null;
  quality: string | null;
  sourceType: string | null;
  isRepack: boolean | null;
  videoCodec: string | null;
  bitDepth: string | null;
  audioChannels: string | null;
  seeders: number | null;
  peers: number | null;
  size: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  playbackStatus: string;
  rightsStatus: string;
  rightsEvidenceUrl: string | null;
  rightsEvidenceNotes: string | null;
  rightsReviewNote: string | null;
  rightsReviewedAt: Date | null;
  activatedAt: Date | null;
}) {
  return {
    id: source.id,
    infoHash: source.infoHash,
    quality: source.quality,
    sourceType: source.sourceType,
    isRepack: source.isRepack,
    videoCodec: source.videoCodec,
    bitDepth: source.bitDepth,
    audioChannels: source.audioChannels,
    seeders: source.seeders,
    peers: source.peers,
    size: source.size,
    sizeBytes: source.sizeBytes,
    uploadedAt: source.uploadedAt,
    playbackStatus: source.playbackStatus,
    rightsStatus: source.rightsStatus,
    rightsEvidenceUrl: source.rightsEvidenceUrl,
    rightsEvidenceNotes: source.rightsEvidenceNotes,
    rightsReviewNote: source.rightsReviewNote,
    rightsReviewedAt: source.rightsReviewedAt,
    activatedAt: source.activatedAt,
  };
}

export function redactTorrentLocators(value: unknown): unknown {
  if (typeof value === "string") {
    const text = value.trim();
    if (
      /^(?:magnet:|torrent:)/i.test(text) ||
      /magnet:\?[^\s"'<>]+/i.test(text) ||
      /https?:\/\/[^\s"'<>]*(?:\.torrent|\/torrent(?:\/|[?#]|$)|magnet:)[^\s"'<>]*/i.test(text)
    ) return "[private torrent locator]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redactTorrentLocators);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    /torrent|magnet/i.test(key) ? "[private torrent data]" : redactTorrentLocators(child),
  ]));
}
