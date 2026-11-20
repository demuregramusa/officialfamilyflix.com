import type { MediaRight, VideoAsset } from "@workspace/db";

type EpisodeRights = MediaRight[];
type EpisodeVideo = VideoAsset | null | undefined;

function hasEpisodeEvidence(right: MediaRight): boolean {
  return right.reviewStatus === "approved" &&
    right.uploaderAttested &&
    right.rightsHolder.trim().length > 0 &&
    right.creatorAttribution.trim().length > 0 &&
    right.sourceUrl.trim().length > 0 &&
    !!right.evidenceUrl?.trim() &&
    right.licenseUrl.trim().length > 0 &&
    right.licenseVersion.trim().length > 0 &&
    right.licenseType !== "unlicensed" &&
    (!right.expiresAt || right.expiresAt.getTime() > Date.now());
}

export function hasEpisodePlaybackAssets(rights: EpisodeRights, video: EpisodeVideo): boolean {
  const mainRights = rights.filter((right) => right.assetKind === "main_video");
  return (
    rights.length > 0 &&
    rights.every(hasEpisodeEvidence) &&
    mainRights.length === 1 &&
    video?.status === "ready" &&
    video.mediaRightId === mainRights[0]!.id
  );
}

export function isSeriesPubliclyVisible(input: {
  kind: string;
  status: string;
  playableEpisodeCount: number;
}): boolean {
  return input.kind === "series" &&
    input.status === "published" &&
    input.playableEpisodeCount > 0;
}

export function isEpisodePubliclyPlayable(input: {
  parentSeriesId: string;
  episodeSeriesId: string;
  parentStatus: string;
  parentKind: string;
  episodeIsPublished: boolean;
  rights: EpisodeRights;
  video: EpisodeVideo;
}): boolean {
  return input.parentSeriesId === input.episodeSeriesId &&
    input.parentStatus === "published" &&
    input.parentKind === "series" &&
    input.episodeIsPublished &&
    hasEpisodePlaybackAssets(input.rights, input.video);
}
