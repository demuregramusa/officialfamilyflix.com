import type { ImportedMovieRecord, ImportedTorrentRecord } from "./movie-archive-parser";

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
