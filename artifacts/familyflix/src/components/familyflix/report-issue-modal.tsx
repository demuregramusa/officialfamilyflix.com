import { useState } from "react";
import { AlertCircle, CheckCircle2, Flag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportIssueModalProps {
  slug: string;
  titleName: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface SupportTicket {
  id: string;
  slug: string;
  titleName: string;
  category: string;
  notes: string;
  status: "open" | "investigating" | "resolved";
  createdAt: number;
}

export function saveLocalTicket(ticket: Omit<SupportTicket, "id" | "createdAt" | "status">): SupportTicket {
  const newTicket: SupportTicket = {
    ...ticket,
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: "open",
    createdAt: Date.now(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem("ff_support_tickets") || "[]");
    const updated = [newTicket, ...(Array.isArray(existing) ? existing : [])];
    localStorage.setItem("ff_support_tickets", JSON.stringify(updated.slice(0, 100)));
    window.dispatchEvent(new Event("ff_support_tickets_updated"));
  } catch {}

  // Also send to backend endpoint if available
  fetch("/api/support/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newTicket),
  }).catch(() => {});

  return newTicket;
}

export function ReportIssueModal({ slug, titleName, isOpen, onClose }: ReportIssueModalProps) {
  const [category, setCategory] = useState("buffering");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveLocalTicket({
      slug,
      titleName,
      category,
      notes: notes.trim(),
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setNotes("");
      onClose();
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#140f22] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center animate-fade-in">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Report Submitted</h3>
            <p className="mt-1 text-xs text-white/60">
              Thank you for keeping FamilyFlix reliable. Our moderator team has received your ticket.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
                <Flag size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Report Playback Issue</h3>
                <p className="text-xs text-white/50">{titleName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-xs text-white outline-none transition focus:border-purple-400"
                >
                  <option value="buffering">Video won't play or keeps buffering</option>
                  <option value="audio_sync">Audio is out of sync or missing</option>
                  <option value="subtitles">Subtitles / Closed Captions incorrect</option>
                  <option value="broken_stream">Broken stream / media error</option>
                  <option value="metadata">Incorrect movie title, poster, or rating</option>
                  <option value="other">Other technical issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe what happened or the exact timestamp of the glitch..."
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-purple-400"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-white/60 flex items-start gap-2">
                <AlertCircle size={15} className="text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Our moderators review reports daily to repair broken streams, sync audio tracks, and ensure seamless FAST streaming.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
