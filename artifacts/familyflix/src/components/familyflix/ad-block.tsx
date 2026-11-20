"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

import { backdropUrl, type Title } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface PlaybackTrack {
  language: string;
  label: string;
  url: string;
  isDefault: boolean;
}

interface PlaybackInfo {
  hlsUrl: string | null;
  mp4Url: string | null;
  posterUrl: string | null;
  subtitles: PlaybackTrack[];
}

function AdBlock({
  promoted,
  remaining,
  durationSeconds,
  skipAfterSeconds,
  onSkip,
}: {
  promoted: Title;
  remaining: number;
  durationSeconds: number;
  skipAfterSeconds: number;
  onSkip: () => void;
}) {
  const total = Math.max(1, durationSeconds);
  const skipAfter = Math.min(Math.max(0, skipAfterSeconds), total);
  const elapsed = total - remaining;
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const skipEnabled = remaining <= total - skipAfter;

  return (
    <div data-ad="root" className="absolute inset-0 animate-fade-in overflow-hidden bg-black">
      <div
        className="absolute inset-0 scale-[1.02] bg-cover bg-center"
        style={{ backgroundImage: `url("${backdropUrl(promoted)}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, #05030b 0%, rgba(5,3,11,0.86) 38%, rgba(5,3,11,0.35) 72%, rgba(5,3,11,0.7) 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-45 mix-blend-soft-light"
        style={{
          background: `linear-gradient(140deg, ${promoted.palette[1]} 0%, transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/55" />

      <div className="absolute left-[4.5%] top-[5.5%] flex items-center gap-2">
        <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-[0.1em] text-black">
          Ad
        </span>
        <span className="hidden rounded-[3px] border border-white/25 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-white/65 sm:inline">
          Sponsored
        </span>
      </div>

      <div className="absolute right-[4.5%] top-[5.5%] flex items-center gap-2">
        <span data-ad="countdown" className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-medium tabular-nums text-white/70 backdrop-blur-md">
          <span className="sm:hidden">{remaining}s</span>
          <span className="hidden sm:inline">
            {remaining > 0 ? `Your show starts in ${remaining}s` : "Starting now"}
          </span>
        </span>
      </div>

      <div data-ad="content" className="absolute inset-x-0 bottom-0 p-[5%] pb-[13%] sm:p-[4.5%] sm:pb-[11%]">
        <div className="max-w-[74%] sm:max-w-[560px]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#b79dff]">
            <span className="inline-block size-1.5 rounded-full bg-[#b79dff]" />
            Now on FamilyFlix
          </p>
          <h2 data-ad="title" className="mt-1.5 text-balance text-[clamp(1.3rem,4.6vw,3.2rem)] font-black uppercase leading-[0.88] tracking-[-0.045em] text-white sm:mt-2">
            {promoted.name}
          </h2>
          <p className="mt-1.5 hidden max-w-[46ch] text-[clamp(11px,1.4vw,13.5px)] leading-relaxed text-white/60 sm:mt-2 sm:block">
            {promoted.tagline} Stream it free right after this break.
          </p>
        </div>

        <p className="mt-4 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-white/35 sm:block">
          Ads keep FamilyFlix free
        </p>
      </div>

      <div data-ad="progress" className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/15">
        <div
          className="h-full bg-white transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        data-ad="skip"
        type="button"
        onClick={onSkip}
        disabled={!skipEnabled}
        aria-label={
          skipEnabled
            ? "Skip ad"
            : `Skip ad available in ${Math.max(0, total - skipAfter - elapsed)} seconds`
        }
        className={cn(
          "absolute bottom-[13%] right-[4.5%] inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-[13%] sm:h-10 sm:gap-2 sm:px-4 sm:text-[12.5px]",
          skipEnabled
            ? "border-white bg-white text-black hover:bg-white/85"
            : "cursor-not-allowed border-white/20 bg-black/45 text-white/45 backdrop-blur",
        )}
      >
        {skipEnabled ? (
          <>
            Skip ad
            <X className="size-3.5" aria-hidden />
          </>
        ) : (
          `Skip in ${Math.max(0, total - skipAfter - elapsed)}s`
        )}
      </button>
    </div>
  );
}

export function AdPlayer({
  title,
  adsEnabled = true,
  durationSeconds = 15,
  skipAfterSeconds = 5,
}: {
  title: Title;
  adsEnabled?: boolean;
  durationSeconds?: number;
  skipAfterSeconds?: number;
}) {
  const initialRemaining = adsEnabled ? Math.max(0, durationSeconds) : 0;
  const [skipped, setSkipped] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loadingPlayback, setLoadingPlayback] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [resumed, setResumed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);
  const promoted = title;
  const showingAd = adsEnabled && !skipped && remaining > 0;
  const resumeKey = `familyflix:resume:${title.slug}`;

  useEffect(() => {
    if (!showingAd) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showingAd]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoadingPlayback(true);
    setPlaybackError(null);

    async function load() {
      try {
        const response = await fetch(
          `/api/playback/${encodeURIComponent(title.slug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json()) as Partial<PlaybackInfo> & {
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setPlaybackError(payload.error ?? "This title cannot play right now.");
          return;
        }
        if (!payload.hlsUrl && !payload.mp4Url) {
          setPlaybackError("This title does not have a playable stream yet.");
          return;
        }
        setPlayback({
          hlsUrl: payload.hlsUrl ?? null,
          mp4Url: payload.mp4Url ?? null,
          posterUrl: payload.posterUrl ?? null,
          subtitles: payload.subtitles ?? [],
        });
      } catch (issue) {
        if (
          cancelled ||
          (issue instanceof DOMException && issue.name === "AbortError")
        ) {
          return;
        }
        setPlaybackError("This title cannot play right now.");
      } finally {
        if (!cancelled) setLoadingPlayback(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [title.slug, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || showingAd || !playback) return;

    const hlsUrl = playback.hlsUrl;
    const mp4Url = playback.mp4Url;
    const isHls = Boolean(hlsUrl && /\.m3u8($|\?)/i.test(hlsUrl));
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (isHls && hlsUrl && !nativeHls) {
      let destroyed = false;
      let instance: { destroy: () => void } | null = null;

      import("hls.js")
        .then((module) => {
          const Hls = module.default;
          if (destroyed) return;
          if (!Hls.isSupported()) {
            video.src = hlsUrl;
            return;
          }
          const hls = new Hls({ enableWorker: true });
          instance = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        })
        .catch(() => {
          if (!destroyed) video.src = hlsUrl;
        });

      return () => {
        destroyed = true;
        instance?.destroy();
        video.removeAttribute("src");
        video.load();
      };
    }

    video.src = hlsUrl ?? mp4Url ?? "";
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }, [playback, showingAd]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted, showingAd]);

  function saveProgress() {
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;
    const now = Math.floor(video.currentTime);
    if (now - lastSaved.current < 5) return;
    lastSaved.current = now;
    if (now < 10) return;
    try {
      window.localStorage.setItem(resumeKey, String(now));
    } catch {
      // Storage can be blocked; resuming is best effort.
    }
  }

  function restoreProgress() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const stored = Number(window.localStorage.getItem(resumeKey));
      if (
        Number.isFinite(stored) &&
        stored > 5 &&
        (!video.duration || stored < video.duration - 10)
      ) {
        video.currentTime = stored;
        setResumed(true);
      }
    } catch {
      // Ignore storage errors.
    }
  }

  function playContent() {
    const video = videoRef.current;
    if (!video) return;
    setVideoError(false);
    video.play().catch(() => setPlaying(false));
  }

  function retry() {
    if (!playback && playbackError) {
      setPlaybackError(null);
      setLoadingPlayback(true);
      setReloadKey((current) => current + 1);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    setVideoError(false);
    setBuffering(true);
    video.load();
    video.play().catch(() => setBuffering(false));
  }

  if (showingAd) {
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-black">
        <AdBlock
          promoted={promoted}
          remaining={remaining}
          durationSeconds={durationSeconds}
          skipAfterSeconds={skipAfterSeconds}
          onSkip={() => setSkipped(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        poster={playback?.posterUrl ?? backdropUrl(title)}
        autoPlay
        muted={muted}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
        onLoadedMetadata={restoreProgress}
        onTimeUpdate={saveProgress}
        onPlaying={() => {
          setPlaying(true);
          setBuffering(false);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onError={() => {
          setVideoError(true);
          setBuffering(false);
        }}
      >
        {playback?.subtitles.map((track) => (
          <track
            key={track.language}
            kind="subtitles"
            src={track.url}
            srcLang={track.language}
            label={track.label}
            default={track.isDefault}
          />
        ))}
        Your browser does not support embedded video.
      </video>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <span className="text-[17px] font-black leading-none tracking-[-0.055em] text-white/80">
          family<span className="text-[#b79dff]">flix</span>
        </span>
        <span className="rounded-[3px] bg-white/10 px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60 backdrop-blur">
          {title.type === "live" ? "Live" : "Free with ads"}
        </span>
        {resumed ? (
          <span className="rounded-[3px] bg-white/10 px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60 backdrop-blur">
            Resumed
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setMuted((current) => !current)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 text-[11px] font-semibold text-white/80 backdrop-blur transition hover:bg-black/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {muted ? (
          <>
            <VolumeX className="size-3.5" aria-hidden />
            Unmute
          </>
        ) : (
          <>
            <Volume2 className="size-3.5" aria-hidden />
            Mute
          </>
        )}
      </button>

      {loadingPlayback && !playback ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70">
          <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
          <span className="sr-only">Loading stream</span>
        </div>
      ) : videoError || (playbackError && !playback) ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
          <div>
            <p className="text-[15px] font-semibold text-white">
              {videoError ? "This stream could not start" : "Stream unavailable"}
            </p>
            <p className="mt-1.5 text-[12.5px] text-white/50">
              {videoError
                ? "Check your connection, then try again."
                : playbackError ?? "This title does not have a playable stream yet."}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-bold text-black transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Try again
            </button>
          </div>
        </div>
      ) : !playing ? (
        <button
          type="button"
          onClick={playContent}
          aria-label={`Play ${title.name}`}
          className="absolute inset-0 grid place-items-center bg-black/45 transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span className="grid size-14 place-items-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105 sm:size-16">
            {buffering ? (
              <span className="size-6 animate-spin rounded-full border-[3px] border-black/20 border-t-black" />
            ) : (
              <Play className="ml-1 size-6" fill="currentColor" aria-hidden />
            )}
          </span>
        </button>
      ) : null}
    </div>
  );
}
