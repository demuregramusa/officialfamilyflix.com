import { useEffect, useState } from "react";
import { ArrowUpRight, Download, Sparkles, X } from "lucide-react";

interface PlatformCard {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  url: string;
}

const DEMURE_PLATFORMS: PlatformCard[] = [
  {
    id: "demuregram",
    name: "DemureGram",
    tagline: "Connect with creators, stories, reels, and live community drops.",
    badge: "Social",
    url: "https://demuregram.com",
  },
  {
    id: "brinn",
    name: "BRiNn Mobile",
    tagline: "Instant US phone numbers, cloud calls, messaging & global travel eSIM.",
    badge: "Wireless & eSIM",
    url: "https://brinn.demuregram.com",
  },
  {
    id: "cashout",
    name: "CashOut Lock & Reserve",
    tagline: "Smart reserve vaults, instant card controls & automated cash flow.",
    badge: "Finance",
    url: "https://cashout.demuregram.com",
  },
  {
    id: "chatdpi",
    name: "ChatDPI AI",
    tagline: "Ask, build, and research faster with Demure Platforms AI assistant.",
    badge: "AI Platform",
    url: "https://chat.demuregram.com",
  },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "demure_spotlight_dismissed_ff";

export function DemureEcosystemSpotlight() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    let timer: number | undefined;
    try {
      if (!sessionStorage.getItem(DISMISS_KEY)) {
        setIndex(Math.floor(Math.random() * DEMURE_PLATFORMS.length));
        timer = window.setTimeout(() => setVisible(true), 12000);
      }
    } catch {
      timer = window.setTimeout(() => setVisible(true), 12000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  if (!visible && !installEvent) return null;

  const item = DEMURE_PLATFORMS[index % DEMURE_PLATFORMS.length];

  return (
    <aside
      aria-label="Explore Demure Platforms"
      className="fixed bottom-20 left-4 z-30 w-[296px] max-w-[calc(100vw-6rem)] space-y-2 sm:bottom-6 sm:left-6"
    >
      {installEvent ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#0095f6]/35 bg-[#12161b]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-[#f5f5f5]">
            <Download className="size-4 shrink-0 text-[#00d2ff]" />
            <span className="font-medium">Install FamilyFlix App</span>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-[#0095f6] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1877f2]"
          >
            Install
          </button>
        </div>
      ) : null}

      {visible ? (
        <div className="rounded-2xl border border-white/12 bg-[#12161b]/95 p-3.5 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00d2ff]">
              <Sparkles className="size-3" />
              <span>From Demure Platforms</span>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss suggestion"
              className="grid size-6 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-2">
              <strong className="text-[14px] font-semibold text-[#f5f5f5]">{item.name}</strong>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[#a8a8a8]">
                {item.badge}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#a8a8a8]">{item.tagline}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-[#f5f5f5] transition hover:bg-[#0095f6] hover:text-white"
            >
              <span>Explore {item.name}</span>
              <ArrowUpRight className="size-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % DEMURE_PLATFORMS.length)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a8a8a8] transition hover:bg-white/[0.08] hover:text-[#f5f5f5]"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
