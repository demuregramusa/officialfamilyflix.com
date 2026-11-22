import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  ChevronRight,
  Loader2,
  Subtitles,
  Check,
  X,
  Download,
  Settings,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/lib/subscription-context";
import { BrandLogo } from "@/components/familyflix/logo";

interface PlaybackData {
  titleName: string;
  url: string;
  streamType?: string;
  posterUrl?: string | null;
  subtitles?: Array<{ id: string; url: string; language: string; label: string; isDefault?: boolean }>;
}

interface PromotedAdTitle {
  name: string;
  tagline?: string;
  backdropUrl?: string;
  posterUrl?: string;
  slug?: string;
}

interface TubiPlayerProps {
  playback: PlaybackData;
  titleName: string;
  promotedTitle?: PromotedAdTitle | null;
  episodeLabel?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  initialTime?: number;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TubiPlayer({
  playback,
  titleName,
  promotedTitle,
  episodeLabel,
  onTimeUpdate,
  onEnded,
  initialTime = 0,
}: TubiPlayerProps) {
  const {
    hasAdFree,
    hasUncappedQuality,
    saveToDevice,
    isDownloaded,
    isSubscribed,
    openSubscriptionModal,
  } = useSubscription();

  // Pre-roll ad state - skip completely if VIP / Ad-Free subscriber
  const [showingAd, setShowingAd] = useState(!hasAdFree);
  const [adRemaining, setAdRemaining] = useState(12);
  const [adCanSkip, setAdCanSkip] = useState(false);
  const [quality, setQuality] = useState("1080p Full HD (Uncapped)");
  const [isSavingOffline, setIsSavingOffline] = useState(false);

  useEffect(() => {
    if (hasAdFree) {
      setShowingAd(false);
    }
  }, [hasAdFree]);

  const [watermarkBrand, setWatermarkBrand] = useState("FamilyFlix");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/v1/monetization/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.watermarkText) setWatermarkBrand(data.watermarkText);
        if (typeof data.watermarkEnabled === "boolean") setWatermarkEnabled(data.watermarkEnabled);
      })
      .catch(() => {});
  }, []);

  // Playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [pulseIcon, setPulseIcon] = useState<"play" | "pause" | null>(null);
  const [hasError, setHasError] = useState(false);

  // Audio & Subtitles settings (English by default, like Tubi)
  const [audioTrack, setAudioTrack] = useState("English (Original)");
  const [subtitleTrack, setSubtitleTrack] = useState("Off");
  const [showSettings, setShowSettings] = useState(false);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Secondary preview video ref for live frame capture during scrubber hold & hover
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewHlsRef = useRef<Hls | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Scrubber hover & drag states (Tubi Timeline Preview)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(0);

  // Tubi-Style Resume & Position Restoration
  const hasSeekedInitialRef = useRef(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumedPosition, setResumedPosition] = useState(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize secondary preview video stream for timeline thumbnail previews
  useEffect(() => {
    const pVideo = previewVideoRef.current;
    if (!pVideo || !playback?.url) return;

    const isHls = /\.m3u8(?:$|[?#])/i.test(playback.url);
    if (isHls && !pVideo.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
      });
      previewHlsRef.current = hls;
      hls.loadSource(playback.url);
      hls.attachMedia(pVideo);
    } else {
      pVideo.src = playback.url;
    }

    return () => {
      if (previewHlsRef.current) {
        previewHlsRef.current.destroy();
        previewHlsRef.current = null;
      }
      pVideo.removeAttribute("src");
      pVideo.load();
    };
  }, [playback?.url]);

  function triggerNotice(text: string) {
    setNoticeText(text);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => {
      setNoticeText(null);
    }, 2400);
  }

  const handleStartFromBeginning = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    setShowResumeBanner(false);
    triggerNotice("Playing from beginning");
    if (onTimeUpdate) onTimeUpdate(0, video.duration || 0);
  }, [onTimeUpdate]);

  const performInitialSeek = useCallback(
    (video: HTMLVideoElement, targetSeconds: number) => {
      if (hasSeekedInitialRef.current || targetSeconds <= 0) return;
      const vidDuration = video.duration || 0;
      // If title was basically finished (within last 15s or >= 95%), start over
      if (vidDuration > 0 && (targetSeconds >= vidDuration - 15 || targetSeconds / vidDuration >= 0.95)) {
        video.currentTime = 0;
        hasSeekedInitialRef.current = true;
        return;
      }
      try {
        video.currentTime = targetSeconds;
        hasSeekedInitialRef.current = true;
        setResumedPosition(targetSeconds);
        setShowResumeBanner(true);
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
          setShowResumeBanner(false);
        }, 6000);
      } catch {}
    },
    []
  );

  // Controls visibility management
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying, showSettings]);

  // Timeline scrub / hover tracking
  const updateScrubTime = useCallback(
    (clientX: number) => {
      const el = timelineRef.current;
      if (!el || duration <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      const target = (x / rect.width) * duration;

      setHoverPercent(percent);
      setHoverTime(target);

      // Fast seek the secondary preview video element
      const pVideo = previewVideoRef.current;
      if (pVideo && Number.isFinite(target)) {
        pVideo.currentTime = target;
      }
      return target;
    },
    [duration]
  );

  const handleTimelinePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setShowResumeBanner(false);
      setIsScrubbing(true);
      setIsHoveringTimeline(true);
      const target = updateScrubTime(e.clientX);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      showControls();
      if (videoRef.current && Number.isFinite(target)) {
        videoRef.current.currentTime = target;
        setCurrentTime(target);
      }
    },
    [updateScrubTime, showControls]
  );

  const handleTimelinePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isScrubbing) {
        const target = updateScrubTime(e.clientX);
        if (videoRef.current && Number.isFinite(target)) {
          videoRef.current.currentTime = target;
          setCurrentTime(target);
        }
      } else {
        updateScrubTime(e.clientX);
      }
    },
    [isScrubbing, updateScrubTime]
  );

  const handleTimelinePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isScrubbing) {
        setIsScrubbing(false);
        setIsHoveringTimeline(false);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        const target = updateScrubTime(e.clientX);
        if (videoRef.current && Number.isFinite(target)) {
          videoRef.current.currentTime = target;
          setCurrentTime(target);
          if (onTimeUpdate) onTimeUpdate(target, duration);
        }
      }
    },
    [isScrubbing, updateScrubTime, onTimeUpdate, duration]
  );

  // Countdown for pre-roll ad
  useEffect(() => {
    if (!showingAd) return;
    const timer = setInterval(() => {
      setAdRemaining((prev) => {
        if (prev <= 8) setAdCanSkip(true);
        if (prev <= 1) {
          clearInterval(timer);
          setShowingAd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showingAd]);

  const handleSkipAd = useCallback(() => {
    setShowingAd(false);
  }, []);

  const triggerPulse = useCallback((type: "play" | "pause") => {
    setPulseIcon(type);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => {
      setPulseIcon(null);
    }, 600);
  }, []);

  const togglePlay = useCallback(() => {
    setShowResumeBanner(false);
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerPulse("play");
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      triggerPulse("pause");
      setControlsVisible(true);
    }
  }, [triggerPulse]);

  const skipSeconds = useCallback((delta: number) => {
    setShowResumeBanner(false);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + delta, video.duration || 0));
    showControls();
  }, [showControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (nextMuted && volume === 0) {
      setVolume(0.8);
      video.volume = 0.8;
    }
  }, [volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    const muted = val === 0;
    video.muted = muted;
    setIsMuted(muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      await container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Video source loading & HLS handling
  useEffect(() => {
    if (showingAd) return;
    const video = videoRef.current;
    if (!video || !playback?.url) return;

    setHasError(false);
    setIsBuffering(true);
    hasSeekedInitialRef.current = false;

    const isHls = /\.m3u8(?:$|[?#])/i.test(playback.url);
    let hlsInstance: Hls | null = null;

    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: true });
        hlsInstance.loadSource(playback.url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          if (initialTime > 0) performInitialSeek(video, initialTime);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
        hlsInstance.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            setHasError(true);
            setIsBuffering(false);
          }
        });
      }
    } else {
      video.src = playback.url;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (hlsInstance) hlsInstance.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [playback?.url, showingAd, initialTime, performInitialSeek]);

  // Handle Subtitle track change on HTML5 video
  const handleSubtitleChange = useCallback((sub: string) => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (sub === "Off") {
        track.mode = "disabled";
      } else if (sub.startsWith("English") && track.language.startsWith("en")) {
        track.mode = "showing";
      } else if (sub.startsWith("Spanish") && track.language.startsWith("es")) {
        track.mode = "showing";
      } else {
        track.mode = "disabled";
      }
    }
  }, []);

  // Video listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime, video.duration || 0);

      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent(Math.min(100, (bufferedEnd / video.duration) * 100));
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsBuffering(false);
      if (initialTime > 0) {
        performInitialSeek(video, initialTime);
      }
    };

    const onCanPlay = () => {
      if (initialTime > 0 && !hasSeekedInitialRef.current) {
        performInitialSeek(video, initialTime);
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setHasError(true);
      setIsBuffering(false);
    };
    const onEndedInternal = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("ended", onEndedInternal);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("ended", onEndedInternal);
    };
  }, [onTimeUpdate, onEnded, initialTime, performInitialSeek]);

  // Tubi Keyboard Shortcuts: Space/K (Play), Left/Right/J/L (Seek 10s), Up/Down (Volume), M (Mute), F (Fullscreen), C (Captions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }
      const video = videoRef.current;
      if (!video || showingAd) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          skipSeconds(-10);
          triggerNotice("Rewind 10s");
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          skipSeconds(10);
          triggerNotice("Fast forward 10s");
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => {
            const next = Math.min(1, Math.round((v + 0.1) * 10) / 10);
            if (video) video.volume = next;
            return next;
          });
          triggerNotice("Volume Up");
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => {
            const next = Math.max(0, Math.round((v - 0.1) * 10) / 10);
            if (video) video.volume = next;
            return next;
          });
          triggerNotice("Volume Down");
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          triggerNotice(video.muted ? "Muted" : "Unmuted");
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "c":
        case "C":
          e.preventDefault();
          setSubtitleTrack((cur) => {
            const next = cur === "Off" ? "English (CC)" : "Off";
            handleSubtitleChange(next);
            triggerNotice(`Captions: ${next}`);
            return next;
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skipSeconds, toggleMute, toggleFullscreen, handleSubtitleChange, showingAd]);

  const handleScrubberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, []);

  const playedPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const adBackdrop = promotedTitle?.backdropUrl || promotedTitle?.posterUrl || playback.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1440&h=810&q=70";
  const adTitle = promotedTitle?.name || titleName;
  const adTagline = promotedTitle?.tagline || "Free streaming with zero subscription fees.";

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onClick={showControls}
      className="group relative aspect-video w-full max-h-[65vh] overflow-hidden rounded-2xl bg-black shadow-[0_30px_90px_-25px_rgba(0,0,0,0.95)] ring-1 ring-white/10 select-none"
    >
      {/* -------------------- PRE-ROLL AD SCREEN (NO OVERLAPPING, ZERO MOVIE POSTER) -------------------- */}
      {showingAd ? (
        <div className="absolute inset-0 z-30 overflow-hidden bg-[#0a0714] animate-fade-in select-none">
          {/* Professional FAST Ad Commercial Slate */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0e0820] via-[#150d2c] to-[#07040d]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_rgba(124,58,237,0.28)_0%,_transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,_rgba(245,158,11,0.15)_0%,_transparent_55%)]" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />

          {/* Center Commercial Stage Indicator */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="grid size-16 place-items-center rounded-2xl bg-white/[0.06] border border-white/10 shadow-2xl backdrop-blur-md">
              <Sparkles className="size-8 text-amber-300 animate-pulse" />
            </div>
            <span className="mt-3.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.24em] text-purple-300">
              FamilyFlix Free Streaming Sponsor
            </span>
            <p className="mt-1 text-xs sm:text-sm text-white/50 max-w-sm">
              Your free presentation begins in moments.
            </p>
          </div>

          {/* Top Bar - pinned to top */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-white px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-black shadow-md">
                AD
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur-md sm:inline-flex">
                <Sparkles className="size-3 text-amber-300" /> Sponsored Showcase
              </span>
            </div>

            <div className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] sm:text-[12px] font-semibold tabular-nums text-white/90 backdrop-blur-md">
              {adRemaining > 0 ? (
                <>Your movie starts in <span className="font-bold text-amber-300">{adRemaining}s</span></>
              ) : (
                "Starting feature presentation..."
              )}
            </div>
          </div>

          {/* Bottom Bar - pinned to bottom, Title on Left, Skip on Right (ZERO OVERLAP) */}
          <div className="absolute inset-x-0 bottom-3 sm:bottom-4 z-20 flex items-end justify-between gap-3 px-3 sm:px-6">
            <div className="min-w-0 max-w-[62%] sm:max-w-[70%]">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
                Sponsored Showcase
              </span>
              <h2 className="mt-0.5 truncate text-base sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
                {adTitle}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-white/75 sm:text-sm">
                {adTagline}
              </p>
            </div>

            <div className="shrink-0">
              {adCanSkip ? (
                <button
                  type="button"
                  onClick={handleSkipAd}
                  className="button-skip-ready"
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "#000000",
                    fontWeight: 900,
                  }}
                  data-testid="button-skip-ad"
                >
                  <span style={{ color: "#000000", fontWeight: 900 }}>Skip Ad</span>
                  <ChevronRight size={18} strokeWidth={3.5} style={{ color: "#000000" }} />
                </button>
              ) : (
                <div
                  className="button-skip-countdown"
                  style={{
                    backgroundColor: "rgba(14, 10, 24, 0.95)",
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.35)",
                  }}
                  data-testid="button-skip-countdown"
                >
                  <Clock size={15} className="text-amber-400 shrink-0" style={{ color: "#fbbf24" }} />
                  <span style={{ color: "#ffffff", fontWeight: 700 }}>Skip in</span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-xs font-black tabular-nums"
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.25)",
                      color: "#fde047",
                      border: "1px solid rgba(245, 158, 11, 0.5)",
                    }}
                  >
                    {Math.max(0, adRemaining - 7)}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Running Progress Strip */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, ((12 - adRemaining) / 12) * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* -------------------- MAIN VIDEO ELEMENT (NO POSTER INSIDE PLAYER) -------------------- */}
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="h-full w-full object-contain cursor-pointer bg-black"
      >
        {playback.subtitles?.map((s) => (
          <track key={s.id} kind="subtitles" src={s.url} srcLang={s.language} label={s.label} default={s.isDefault} />
        ))}
      </video>

      {/* -------------------- OVERLAY TOP HEADER & WATERMARK (ZERO OVERLAP) -------------------- */}
      {!showingAd && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-15 flex items-center justify-between gap-3 p-3.5 sm:p-5 bg-gradient-to-b from-black/85 via-black/40 to-transparent"
        >
          {/* Title on Left (fades out when controls hide) */}
          <div
            className={cn(
              "min-w-0 flex-1 transition-opacity duration-300",
              controlsVisible || !isPlaying ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="truncate text-sm font-bold text-white drop-shadow sm:text-base">
              {titleName}
            </p>
            {episodeLabel ? (
              <p className="truncate text-xs font-medium text-white/70">{episodeLabel}</p>
            ) : null}
          </div>

          {/* Brand Watermark on Right - appears on hover, disappears when hover fades */}
          {watermarkEnabled && (
            <div
              className={cn(
                "shrink-0 select-none transition-all duration-300 pointer-events-none",
                controlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
              )}
              aria-hidden="true"
              data-testid="player-watermark-familyflix"
            >
              <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/15 shadow-xl">
                <span className="flex size-4 items-center justify-center rounded-sm bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-sm text-white">
                  <BrandLogo className="size-2.5 ml-0.5 fill-white text-white" />
                </span>
                <span className="font-extrabold tracking-tight text-[11px] sm:text-xs text-white">
                  {watermarkBrand === "FamilyFlix" ? (
                    <>Family<span className="text-purple-400">Flix</span></>
                  ) : (
                    watermarkBrand
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- INSTAGRAM-STYLE CENTER PULSE -------------------- */}
      {pulseIcon ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="grid size-20 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-300 scale-110 animate-fade-out shadow-2xl">
            {pulseIcon === "play" ? (
              <Play className="ml-1 size-9 fill-current" />
            ) : (
              <Pause className="size-9 fill-current" />
            )}
          </div>
        </div>
      ) : null}

      {/* -------------------- BUFFERING SPINNER ("Loading, please wait...") -------------------- */}
      {isBuffering && !showingAd && !hasError ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-xs">
          <Loader2 className="size-10 animate-spin text-purple-400" />
          <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">Loading, please wait...</span>
        </div>
      ) : null}

      {/* -------------------- ON-SCREEN NOTICE TOAST (e.g. Subtitles / Audio) -------------------- */}
      {noticeText ? (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="rounded-full bg-black/85 px-4 py-1.5 text-xs font-semibold text-white shadow-xl border border-white/15 backdrop-blur-md">
            {noticeText}
          </div>
        </div>
      ) : null}

      {/* -------------------- TUBI-STYLE RESUME PILL (MICRO 50% COMPACT, ZERO OVERLAP) -------------------- */}
      {showResumeBanner && !showingAd ? (
        <div
          className="absolute bottom-22 sm:bottom-24 left-3 sm:left-4 z-30 animate-fade-in pointer-events-auto"
          data-testid="player-resume-card"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0e081c]/95 px-2 py-0.5 shadow-xl backdrop-blur-xl text-white">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight">
              <Play size={9} className="fill-amber-400 text-amber-400 shrink-0" />
              <span>Resume at <span className="font-mono font-extrabold text-amber-300">{formatTime(resumedPosition)}</span></span>
            </span>

            <button
              type="button"
              onClick={() => setShowResumeBanner(false)}
              className="inline-flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-xs hover:bg-white/90 active:scale-95 transition"
              style={{ color: "#000000" }}
              data-testid="button-resume-continue"
            >
              Resume
            </button>

            <button
              type="button"
              onClick={handleStartFromBeginning}
              className="inline-flex items-center justify-center gap-0.5 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/80 hover:bg-white/20 hover:text-white active:scale-95 transition"
              data-testid="button-resume-start-over"
            >
              <RotateCcw size={9} />
              <span>Start Over</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResumeBanner(false)}
              className="rounded-full p-0.5 text-white/40 hover:bg-white/15 hover:text-white transition"
              aria-label="Dismiss resume prompt"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      ) : null}

      {/* -------------------- ERROR OVERLAY -------------------- */}
      {hasError ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center">
          <p className="text-base font-semibold text-white/90">
            Playback is buffering or momentarily reconnecting.
          </p>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                setHasError(false);
                setIsBuffering(true);
                video.load();
                video.play().catch(() => {});
              }
            }}
            className="rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-white/90 shadow-xl"
            style={{ color: "#000000" }}
          >
            Retry Stream
          </button>
        </div>
      ) : null}

      {/* -------------------- OVERLAY BOTTOM CONTROLS -------------------- */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 sm:p-5",
          controlsVisible || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Scrubber Bar Container with Live Frame Preview (Tubi Style - 50% Compact) */}
        <div className="relative w-full">
          {/* Floating Live Video Thumbnail Preview (50% Smaller) */}
          <div
            className={cn(
              "pointer-events-none absolute bottom-8 sm:bottom-9 z-40 -translate-x-1/2 transition-all duration-100 ease-out",
              (isHoveringTimeline || isScrubbing) && duration > 0
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-1 pointer-events-none invisible"
            )}
            style={{ left: `${Math.max(6, Math.min(hoverPercent, 94))}%` }}
            data-testid="timeline-preview-card"
          >
            {/* Micro 50% Preview Box */}
            <div className="relative aspect-video w-[72px] sm:w-[84px] overflow-hidden rounded-md border border-purple-500/60 bg-black shadow-[0_8px_20px_rgba(0,0,0,0.95)] ring-1 ring-black">
              {/* Fallback Artwork Image */}
              <img
                src={playback.posterUrl || promotedTitle?.backdropUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=70"}
                alt="Frame preview fallback"
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />

              {/* Secondary Preview Video Element Rendering The Live Frame */}
              <video
                ref={previewVideoRef}
                muted
                playsInline
                preload="auto"
                className="relative z-10 h-full w-full object-cover"
              />

              {/* Tubi Micro Timestamp Badge Overlay */}
              <div className="absolute inset-x-0 bottom-1 z-20 flex justify-center">
                <span className="rounded bg-black/90 px-1 py-0.2 text-[9px] font-mono font-bold text-white shadow-xs border border-white/20 tabular-nums scale-95 leading-none">
                  {formatTime(hoverTime)}
                </span>
              </div>
            </div>

            {/* Micro Triangle Caret Pointer to Scrubber Bar */}
            <div className="mx-auto w-0 h-0 border-x-3.5 border-x-transparent border-t-3.5 border-t-purple-500/80 -mt-0.5 drop-shadow-xs" />
          </div>

          {/* Interactive Timeline Track */}
          <div
            ref={timelineRef}
            onPointerDown={handleTimelinePointerDown}
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={handleTimelinePointerUp}
            onPointerCancel={handleTimelinePointerUp}
            onPointerEnter={() => setIsHoveringTimeline(true)}
            onPointerLeave={() => {
              if (!isScrubbing) setIsHoveringTimeline(false);
            }}
            className="group/scrub relative flex h-7 w-full cursor-pointer items-center touch-none select-none"
            data-testid="player-timeline-scrubber"
          >
            {/* Background Base Track */}
            <div className="h-1.5 w-full rounded-full bg-white/20 transition-all duration-200 group-hover/scrub:h-2.5">
              {/* Buffered Track */}
              <div
                className="h-full rounded-full bg-white/35"
                style={{ width: `${bufferedPercent}%` }}
              />
            </div>

            {/* Hover Ghost Track */}
            {isHoveringTimeline && (
              <div
                className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-white/25 transition-all group-hover/scrub:h-2.5"
                style={{ width: `${hoverPercent}%` }}
              />
            )}

            {/* Played Progress Track */}
            <div
              className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-amber-400 transition-all duration-150 group-hover/scrub:h-2.5"
              style={{ width: `${isScrubbing ? hoverPercent : playedPercent}%` }}
            />

            {/* Scrubber Knob */}
            <div
              className={cn(
                "absolute size-3.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] border-2 border-purple-500 transition-transform",
                isScrubbing || isHoveringTimeline ? "scale-125" : "scale-0 group-hover/scrub:scale-100"
              )}
              style={{ left: `${isScrubbing ? hoverPercent : playedPercent}%` }}
            />
          </div>
        </div>

        {/* Control Buttons Row */}
        <div className="mt-2 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-8 sm:size-9 place-items-center rounded-full text-white transition hover:bg-white/15 active:scale-95 shrink-0"
            >
              {isPlaying ? (
                <Pause className="size-4 sm:size-5 fill-current" />
              ) : (
                <Play className="ml-0.5 size-4 sm:size-5 fill-current" />
              )}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              aria-label="Rewind 10 seconds"
              className="grid size-8 sm:size-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95 shrink-0"
            >
              <RotateCcw className="size-3.5 sm:size-4" />
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => skipSeconds(10)}
              aria-label="Fast forward 10 seconds"
              className="grid size-8 sm:size-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95 shrink-0"
            >
              <RotateCw className="size-3.5 sm:size-4" />
            </button>

            {/* Volume / Mute */}
            <div className="group/vol flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="grid size-8 sm:size-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-3.5 sm:size-4" />
                ) : (
                  <Volume2 className="size-3.5 sm:size-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume slider"
                className="hidden sm:block h-1 w-14 cursor-pointer accent-purple-400 opacity-60 transition group-hover/vol:opacity-100 sm:w-16 md:w-20"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] sm:text-xs font-mono font-medium tabular-nums text-white/70 whitespace-nowrap shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Audio & Subtitles Selector (Tubi Style) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                aria-label="Audio and Subtitles settings"
                className={cn(
                  "grid size-8 sm:size-9 place-items-center rounded-full transition active:scale-95 shrink-0",
                  showSettings || subtitleTrack !== "Off"
                    ? "bg-purple-600/90 text-white shadow-md ring-1 ring-purple-400/50"
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                )}
                data-testid="button-audio-subtitles"
              >
                <Subtitles className="size-3.5 sm:size-4" />
              </button>

              {/* Tubi Audio & Subtitles Popover */}
              {showSettings && (
                <div
                  className="absolute bottom-12 right-0 z-50 w-72 max-w-[calc(100vw-24px)] max-h-72 overflow-y-auto rounded-2xl border border-white/20 bg-[#120e1d]/95 p-4 shadow-2xl backdrop-blur-2xl text-white animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Subtitles className="size-4 text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Audio & Subtitles
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-3 text-xs">
                    {/* Audio Language */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                        Audio Language (Default: English)
                      </span>
                      <div className="space-y-1">
                        {[
                          { id: "English (Original)", label: "English (Original) — Default" },
                          { id: "English (Audio Description)", label: "English (Audio Description)" },
                          { id: "Spanish (Español)", label: "Spanish (Español)" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setAudioTrack(opt.id);
                              triggerNotice(`Audio: ${opt.id}`);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition",
                              audioTrack === opt.id
                                ? "bg-purple-600/30 text-white font-semibold ring-1 ring-purple-500/50"
                                : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            <span className="truncate">{opt.label}</span>
                            {audioTrack === opt.id ? <Check className="size-3.5 text-purple-400 shrink-0" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtitles / CC */}
                    <div className="pt-2 border-t border-white/10">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                        Subtitles / Closed Captions
                      </span>
                      <div className="space-y-1">
                        {[
                          { id: "Off", label: "Off" },
                          { id: "English [CC]", label: "English [CC]" },
                          { id: "Spanish (Español)", label: "Spanish (Español)" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSubtitleTrack(opt.id);
                              handleSubtitleChange(opt.id);
                              triggerNotice(opt.id === "Off" ? "Subtitles: Off" : `Subtitles: ${opt.id}`);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition",
                              subtitleTrack === opt.id
                                ? "bg-purple-600/30 text-white font-semibold ring-1 ring-purple-500/50"
                                : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            <span>{opt.label}</span>
                            {subtitleTrack === opt.id ? <Check className="size-3.5 text-purple-400 shrink-0" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Selector (Uncapped for VIP) */}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                          Video Quality
                        </span>
                        {isSubscribed ? (
                          <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold text-amber-300">
                            UNLIMITED
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/50">HD Standard</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: "Auto (Adaptive)", label: "Auto (Adaptive)" },
                          { id: "720p HD", label: "720p HD (60fps)" },
                          { id: "1080p Full HD (Uncapped)", label: "1080p Full HD (Uncapped)" },
                          { id: "4K Ultra HD (VIP)", label: "4K Ultra HD (VIP Master)" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (opt.id.includes("VIP") && !isSubscribed) {
                                openSubscriptionModal();
                                return;
                              }
                              setQuality(opt.id);
                              triggerNotice(`Video Quality: ${opt.id}`);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition",
                              quality === opt.id
                                ? "bg-purple-600/30 text-white font-semibold ring-1 ring-purple-500/50"
                                : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            <span>{opt.label}</span>
                            {quality === opt.id ? <Check className="size-3.5 text-purple-400 shrink-0" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save to Device (Offline Download) */}
            <button
              type="button"
              onClick={async () => {
                if (!isSubscribed) {
                  openSubscriptionModal();
                  return;
                }
                const slugCandidate =
                  playback.url.split("/").pop() || titleName.toLowerCase().replace(/\s+/g, "-");
                if (isDownloaded(slugCandidate)) {
                  triggerNotice("Already saved to device for offline streaming!");
                  return;
                }
                setIsSavingOffline(true);
                await saveToDevice({
                  slug: slugCandidate,
                  name: titleName,
                  posterUrl: playback.posterUrl || undefined,
                  episodeName: episodeLabel,
                });
                setTimeout(() => {
                  setIsSavingOffline(false);
                  triggerNotice("Saved to Device! Available offline.");
                }, 900);
              }}
              aria-label="Save to Device"
              className={cn(
                "grid size-9 sm:size-10 place-items-center rounded-full transition active:scale-95",
                isSavingOffline
                  ? "bg-purple-600 text-white animate-pulse"
                  : "text-white/80 hover:bg-white/15 hover:text-white"
              )}
              title="Save to Device for Offline Playback"
            >
              <Download className={cn("size-4", isSavingOffline && "animate-bounce")} />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="grid size-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95 sm:size-10"
            >
              {isFullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
