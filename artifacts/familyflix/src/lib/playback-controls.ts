export type ApprovedNextTitle = {
  slug: string;
  name: string;
  kind: string;
};

export type ApprovedEpisode = {
  id: string;
  name: string;
};

export type NextPlaybackTarget = {
  href: string;
  label: string;
};

export function getResumePosition(
  progressSeconds: number,
  savedDurationSeconds: number,
  mediaDurationSeconds: number,
): number {
  if (
    !Number.isFinite(progressSeconds) ||
    !Number.isFinite(savedDurationSeconds) ||
    !Number.isFinite(mediaDurationSeconds) ||
    progressSeconds < 3 ||
    savedDurationSeconds <= 0 ||
    mediaDurationSeconds <= 0
  ) return 0;

  const remainingSeconds = Math.min(
    savedDurationSeconds - progressSeconds,
    mediaDurationSeconds - progressSeconds,
  );
  if (remainingSeconds <= 30) return 0;
  return Math.max(0, Math.min(progressSeconds, mediaDurationSeconds));
}

export function getNextPlaybackTarget(options: {
  slug: string;
  episodeId?: string;
  episodes: ApprovedEpisode[];
  titles: ApprovedNextTitle[];
}): NextPlaybackTarget | null {
  const { slug, episodeId } = options;
  const episodes = Array.isArray(options.episodes) ? options.episodes : [];
  const titles = Array.isArray(options.titles) ? options.titles : [];
  if (episodeId) {
    const currentEpisodeIndex = episodes.findIndex((episode) => episode.id === episodeId);
    const nextEpisode = currentEpisodeIndex >= 0 ? episodes[currentEpisodeIndex + 1] : undefined;
    if (nextEpisode) {
      return {
        href: `/watch/${encodeURIComponent(slug)}/${encodeURIComponent(nextEpisode.id)}`,
        label: nextEpisode.name,
      };
    }
  }

  const currentTitleIndex = titles.findIndex((title) => title.slug === slug);
  if (currentTitleIndex < 0) return null;
  const nextTitle = titles.slice(currentTitleIndex + 1).find((title) => title.kind === "movie");
  return nextTitle
    ? { href: `/watch/${encodeURIComponent(nextTitle.slug)}`, label: nextTitle.name }
    : null;
}

export function startAutoplayCountdown(
  enabled: boolean,
  seconds: number,
  onTick: (remainingSeconds: number) => void,
  onComplete: () => void,
  schedule: (callback: () => void, delayMs: number) => unknown =
    (callback, delayMs) => window.setInterval(callback, delayMs),
  cancel: (handle: unknown) => void =
    (handle) => window.clearInterval(handle as number),
): () => void {
  if (!enabled || !Number.isInteger(seconds) || seconds <= 0) return () => {};

  let remaining = seconds;
  let stopped = false;
  let handle: unknown;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (handle !== undefined) cancel(handle);
  };

  onTick(remaining);
  handle = schedule(() => {
    if (stopped) return;
    remaining -= 1;
    onTick(remaining);
    if (remaining <= 0) {
      stop();
      onComplete();
    }
  }, 1000);
  return stop;
}
