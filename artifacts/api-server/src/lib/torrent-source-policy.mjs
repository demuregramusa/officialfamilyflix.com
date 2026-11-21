export function isValidTorrentInfoHash(value) {
  return typeof value === "string" && (
    /^[a-f0-9]{40}$/i.test(value) ||
    /^[a-z2-7]{32}$/i.test(value)
  );
}

export function hasReviewedTorrentRights(source) {
  if (
    source.rightsStatus !== "approved" ||
    !source.rightsEvidenceNotes?.trim() ||
    source.rightsEvidenceNotes.trim().length < 20 ||
    !source.rightsReviewedBy ||
    !source.rightsReviewedAt ||
    !isValidTorrentInfoHash(source.infoHash)
  ) return false;

  try {
    const evidenceUrl = new URL(source.rightsEvidenceUrl ?? "");
    return evidenceUrl.protocol === "https:" &&
      !evidenceUrl.username &&
      !evidenceUrl.password &&
      !/magnet|torrent/i.test(`${evidenceUrl.hostname}${evidenceUrl.pathname}${evidenceUrl.search}`);
  } catch {
    return false;
  }
}

export function isTorrentPlaybackEligible(source, sourceAvailable) {
  return sourceAvailable &&
    source.playbackStatus === "active" &&
    Boolean(source.activatedBy && source.activatedAt) &&
    hasReviewedTorrentRights(source);
}
