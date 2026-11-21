export interface TorrentRightsState {
  infoHash: string | null;
  playbackStatus: string;
  rightsStatus: string;
  rightsEvidenceUrl: string | null;
  rightsEvidenceNotes: string | null;
  rightsReviewedBy: string | null;
  rightsReviewedAt: Date | null;
  activatedBy: string | null;
  activatedAt: Date | null;
}

export function isValidTorrentInfoHash(value: string | null | undefined): value is string;
export function hasReviewedTorrentRights(source: TorrentRightsState): boolean;
export function isTorrentPlaybackEligible(
  source: TorrentRightsState,
  sourceAvailable: boolean,
): boolean;
