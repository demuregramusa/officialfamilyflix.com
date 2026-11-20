import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Film,
  Lock,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";

import { MovieStatusBadge } from "@/components/admin/status-badge";
import { getStaffSession } from "@/lib/admin-auth";
import { auditLabel } from "@/lib/admin/audit";
import { can, MODERATOR_RESTRICTIONS } from "@/lib/admin/permissions";
import { countMovies, recentAudit, recentMovies } from "@/lib/admin/movies";
import { cloudflareConfigured } from "@/lib/video/cloudflare";
import { tmdbConfigured } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const session = await getStaffSession();
  const params = await searchParams;
  const role = session.user.role;
  const isModerator = role === "moderator";

  const [stats, latest, audit] = await Promise.all([
    countMovies(),
    recentMovies(6),
    recentAudit(8),
  ]);

  const cards = [
    { label: "Titles", value: stats.total, icon: Film },
    { label: "Published", value: stats.published, icon: CheckCircle2 },
    { label: "Drafts", value: stats.drafts, icon: CircleDashed },
    { label: "Streams ready", value: stats.assetsReady, icon: UploadCloud },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
            Admin console
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            Catalog, streaming assets and licensing at a glance.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50">
            <ShieldCheck className="size-3" aria-hidden />
            {isModerator ? "Moderator access" : "Administrator access"}
          </p>
        </div>
        {can(role, "library.create") ? (
          <Link
            href="/admin/library/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus className="size-4" aria-hidden />
            Add title
          </Link>
        ) : null}
      </div>

      {params.denied ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
          <Lock className="size-4 text-amber-300" aria-hidden />
          <p className="text-[12.5px] text-amber-100">
            That area is restricted for your role. An administrator can grant access.
          </p>
        </div>
      ) : null}

      {isModerator ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-100">
                <Lock className="size-4 text-amber-300" aria-hidden />
                Moderator permissions
              </h2>
              <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-amber-100/60">
                You can edit catalog metadata and subtitles. These actions are
                enforced on the server and rate limited.
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-300/30 px-3 text-[11.5px] font-semibold text-amber-100 transition hover:border-amber-200/50 hover:text-white"
            >
              <Settings className="size-3.5" aria-hidden />
              View site settings
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {MODERATOR_RESTRICTIONS.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2"
              >
                <p className="text-[11.5px] font-medium text-white/75">{item.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/35">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/staff"
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            <Users className="size-4 text-[#b79dff]" aria-hidden />
            <span className="flex-1">
              <span className="block text-[12.5px] font-semibold text-white">
                Staff &amp; moderators
              </span>
              <span className="block text-[11px] text-white/35">
                Create accounts, change roles and set limits.
              </span>
            </span>
            <ArrowRight className="size-3.5 text-white/30" aria-hidden />
          </Link>
          <Link
            href="/admin/activity"
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            <ShieldCheck className="size-4 text-emerald-300" aria-hidden />
            <span className="flex-1">
              <span className="block text-[12.5px] font-semibold text-white">
                Audit trail
              </span>
              <span className="block text-[11px] text-white/35">
                Review every settings, staff and catalog change.
              </span>
            </span>
            <ArrowRight className="size-3.5 text-white/30" aria-hidden />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/30">
                {card.label}
              </p>
              <card.icon className="size-4 text-white/25" aria-hidden />
            </div>
            <p className="mt-2 text-[26px] font-black leading-none text-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {stats.publishedWithoutStream > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="size-4 text-amber-300" aria-hidden />
          <p className="text-[12.5px] text-amber-100">
            {stats.publishedWithoutStream} published{" "}
            {stats.publishedWithoutStream === 1 ? "title has" : "titles have"} no
            ready stream.
          </p>
          <Link
            href="/admin/library?status=published"
            className="text-[12px] font-semibold text-amber-200 underline decoration-amber-300/40 underline-offset-2 hover:text-white"
          >
            Review library
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-white">Recently updated</h2>
            <Link
              href="/admin/library"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-white/45 transition-colors hover:text-white"
            >
              View all
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {latest.map((movie) => (
              <li key={movie.id}>
                <Link
                  href={`/admin/library/${movie.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white">
                      {movie.name}
                    </p>
                    <p className="mt-0.5 text-[11px] capitalize text-white/30">
                      {movie.kind} · updated {formatDate(movie.updatedAt)}
                    </p>
                  </div>
                  <MovieStatusBadge status={movie.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-[13px] font-semibold text-white">Setup</h2>
          <ul className="mt-3 space-y-3">
            <li className="flex gap-2.5">
              {cloudflareConfigured() ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-white/25" aria-hidden />
              )}
              <div>
                <p className="text-[12px] font-medium text-white/80">Cloudflare Stream</p>
                <p className="text-[11px] leading-relaxed text-white/35">
                  {cloudflareConfigured()
                    ? "Uploads and signed playback are configured."
                    : "Add API credentials to enable direct uploads."}
                </p>
              </div>
            </li>
            <li className="flex gap-2.5">
              {tmdbConfigured() ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-white/25" aria-hidden />
              )}
              <div>
                <p className="text-[12px] font-medium text-white/80">TMDb metadata</p>
                <p className="text-[11px] leading-relaxed text-white/35">
                  {tmdbConfigured()
                    ? "Title search and metadata import are enabled."
                    : "Add a TMDb key to import artwork and cast."}
                </p>
              </div>
            </li>
            <li className="flex gap-2.5">
              <Radio className="mt-0.5 size-4 shrink-0 text-white/25" aria-hidden />
              <div>
                <p className="text-[12px] font-medium text-white/80">
                  {stats.assetsProcessing} processing
                </p>
                <p className="text-[11px] leading-relaxed text-white/35">
                  Uploads in progress across the library.
                </p>
              </div>
            </li>
          </ul>
          <Link
            href="/admin/settings"
            className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-white/15 text-[12px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
          >
            {isModerator ? "View site settings" : "Open site settings"}
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-[13px] font-semibold text-white">Recent activity</h2>
        {audit.length ? (
          <ul className="mt-3 space-y-2.5">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                <span className="font-medium text-white/75">
                  {entry.userEmail ?? "System"}
                </span>
                <span className="text-white/40">{auditLabel(entry.action)}</span>
                <span className="text-white/25">· {formatDate(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-white/35">
            No admin activity yet. Changes will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
