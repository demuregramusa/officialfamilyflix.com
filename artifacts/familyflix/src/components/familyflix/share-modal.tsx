import { useState } from "react";
import {
  X as CloseIcon,
  Check,
  Copy,
  Share2,
  ExternalLink,
  MessageCircle,
  Send,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleName: string;
  slug: string;
  episodeId?: string;
  episodeLabel?: string;
  synopsis?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  titleName,
  slug,
  episodeId,
  episodeLabel,
  synopsis,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://familyflix.tv";
  const shareUrl = episodeId
    ? `${origin}/watch/${slug}/${episodeId}`
    : `${origin}/title/${slug}`;

  const displayName = episodeLabel ? `${titleName} (${episodeLabel})` : titleName;
  const shareText = `Watch "${displayName}" free on FamilyFlix! ${synopsis ? synopsis.slice(0, 100) + "..." : "100% Free streaming on all devices."}`;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const platforms = [
    {
      name: "X (Twitter)",
      icon: "𝕏",
      color: "bg-black hover:bg-zinc-800 text-white",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      icon: "💬",
      color: "bg-[#25D366] hover:bg-[#20ba59] text-white",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
    },
    {
      name: "Facebook",
      icon: "f",
      color: "bg-[#1877F2] hover:bg-[#1567d3] text-white",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Telegram",
      icon: "✈️",
      color: "bg-[#229ED9] hover:bg-[#1d8cc2] text-white",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: "Reddit",
      icon: "🤖",
      color: "bg-[#FF4500] hover:bg-[#e03d00] text-white",
      href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(displayName + " on FamilyFlix")}`,
    },
    {
      name: "LinkedIn",
      icon: "in",
      color: "bg-[#0A66C2] hover:bg-[#084d94] text-white",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: shareText,
          url: shareUrl,
        });
      } catch {}
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#120e1d] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
        >
          <CloseIcon size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/30">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Share to Social Media</h3>
            <p className="text-xs text-white/60 truncate max-w-[280px]">
              {displayName}
            </p>
          </div>
        </div>

        {/* Social Grid */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition ${p.color}`}
            >
              <span className="text-lg leading-none">{p.icon}</span>
              <span>{p.name}</span>
            </a>
          ))}
        </div>

        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            onClick={handleNativeShare}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-600/20 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition"
          >
            <Share2 size={14} /> Share via Device Apps
          </button>
        )}

        {/* Copy Link Input */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Direct Share Link
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1.5 pl-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs text-white/90 outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-300" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
