import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Shield,
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Film,
  Search,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { type SupportTicket } from "@/components/familyflix/report-issue-modal";
import { useListAdminTitles } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const DEFAULT_SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: "ticket-101",
    slug: "vittoria-2024",
    titleName: "Vittoria (2024)",
    category: "audio_sync",
    notes: "Audio is approximately 500ms ahead of the actor dialogue in the opening scene.",
    status: "open",
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: "ticket-102",
    slug: "night-of-the-living-dead",
    titleName: "Night of the Living Dead (1968)",
    category: "subtitles",
    notes: "English Closed Captions have minor sync delay during graveyard scene.",
    status: "investigating",
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: "ticket-103",
    slug: "charlie-chaplin-the-kid",
    titleName: "The Kid (1921)",
    category: "metadata",
    notes: "Audience rating showed Not Rated; should be G / Family.",
    status: "resolved",
    createdAt: Date.now() - 3600000 * 24,
  },
];

export function ModeratorPortal() {
  const [activeTab, setActiveTab] = useState<"tickets" | "metadata">("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem("ff_support_tickets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SAMPLE_TICKETS;
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [metadataSearch, setMetadataSearch] = useState("");
  const titlesQuery = useListAdminTitles({ query: metadataSearch.trim() || undefined });

  useEffect(() => {
    function refresh() {
      try {
        const saved = localStorage.getItem("ff_support_tickets");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setTickets(parsed);
        }
      } catch {}
    }
    window.addEventListener("ff_support_tickets_updated", refresh);
    return () => window.removeEventListener("ff_support_tickets_updated", refresh);
  }, []);

  function updateTicketStatus(id: string, newStatus: SupportTicket["status"]) {
    setTickets((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
      try {
        localStorage.setItem("ff_support_tickets", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30">
              Moderator Portal
            </span>
            <span className="text-xs text-white/40">Guardians of Catalog Quality</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 sm:text-3xl">
            Content Quality & Support Dashboard
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Resolve viewer-reported video issues and review movie metadata & audience ratings before publication.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#12161b] px-4 py-2 text-center">
            <div className="text-xs text-white/40">Open Tickets</div>
            <div className="text-lg font-black text-amber-400">
              {tickets.filter((t) => t.status === "open").length}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#12161b] px-4 py-2 text-center">
            <div className="text-xs text-white/40">Resolved</div>
            <div className="text-lg font-black text-emerald-400">
              {tickets.filter((t) => t.status === "resolved").length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("tickets")}
          className={cn(
            "flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition",
            activeTab === "tickets"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-white/50 hover:text-white"
          )}
        >
          <Flag size={16} />
          <span>User Support Tickets ({tickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          className={cn(
            "flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition",
            activeTab === "metadata"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-white/50 hover:text-white"
          )}
        >
          <Film size={16} />
          <span>Metadata & Ratings Review</span>
        </button>
      </div>

      {/* TICKETS TAB */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {["all", "open", "investigating", "resolved"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition",
                    statusFilter === s
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs text-white/40">
              Showing {filteredTickets.length} reports
            </span>
          </div>

          {/* Ticket List */}
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-[#12161b] p-5 shadow-lg transition hover:border-white/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{t.titleName}</h3>
                      <Link
                        href={`/title/${t.slug}`}
                        className="text-white/40 hover:text-white transition"
                        title="View title"
                      >
                        <ExternalLink size={13} />
                      </Link>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/70">
                        {t.category.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/70">{t.notes || "No details provided."}</p>
                    <p className="mt-2 text-[10px] text-white/40">
                      Reported {new Date(t.createdAt).toLocaleString()} · Ticket ID: {t.id}
                    </p>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-2">
                    <select
                      value={t.status}
                      onChange={(e) => updateTicketStatus(t.id, e.target.value as any)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none border transition cursor-pointer",
                        t.status === "open"
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : t.status === "investigating"
                          ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
                          : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      )}
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-white/50">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-white">All caught up!</p>
                <p className="text-xs text-white/40 mt-1">
                  No {statusFilter !== "all" ? statusFilter : ""} user reports pending in the moderation queue.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* METADATA REVIEW TAB */}
      {activeTab === "metadata" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-white/40" />
            <input
              type="text"
              value={metadataSearch}
              onChange={(e) => setMetadataSearch(e.target.value)}
              placeholder="Search catalog titles to review..."
              className="w-full rounded-xl border border-white/15 bg-black/50 pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-purple-400"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12161b] overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="p-4">Title / Slug</th>
                  <th className="p-4">Kind</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Stream</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {titlesQuery.data?.slice(0, 20).map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-white">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-white/40 font-mono">{t.slug}</div>
                    </td>
                    <td className="p-4 uppercase">{t.kind}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          t.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-purple-300">
                      {(t as any).rating || "Not Rated"}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          t.streamStatus === "ready"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-white/60"
                        )}
                      >
                        {t.streamStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/library/${t.id}`}
                        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20 transition"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
