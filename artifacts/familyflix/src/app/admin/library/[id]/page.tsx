import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Play,
} from "lucide-react";

import { DeleteTitleButton } from "@/components/admin/delete-title-button";
import {
  MovieForm,
  movieToFormValues,
  type MoviePassThrough,
} from "@/components/admin/movie-form";
import { MovieStatusBadge, StreamStatusBadge } from "@/components/admin/status-badge";
import { StreamPanel, type StreamAsset } from "@/components/admin/stream-panel";
import { SubtitleManager } from "@/components/admin/subtitle-manager";
import { requireStaffPage } from "@/lib/admin-auth";
import { can } from "@/lib/admin/permissions";
import { getAdminMovie, publishBlockers } from "@/lib/admin/movies";
import {
  cloudflareConfigured,
  cloudflareSigningConfigured,
} from "@/lib/video/cloudflare";
import { tmdbConfigured } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

export default async function EditTitlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStaffPage("library.edit");
  const { id } = await params;
  const result = await getAdminMovie(id);
  if (!result) notFound();

  const canManageRights = can(session.user.role, "rights.manage");
  const canPublish = can(session.user.role, "library.publish");
  const canDelete = can(session.user.role, "library.delete");
  const canManageStream = can(session.user.role, "stream.manage");

  const { movie, genres, subtitles, asset } = result;

  const initial = movieToFormValues(movie, genres);
  const passThrough: MoviePassThrough = {
    episodes: movie.episodes,
    live: movie.live,
    palette: movie.palette,
    imageId: movie.imageId,
    tmdbId: movie.tmdbId,
  };

  const streamAsset: StreamAsset | null = asset
    ? {
        id: asset.id,
        provider: asset.provider,
        providerAssetId: asset.providerAssetId,
        status: asset.status,
        hlsUrl: asset.hlsUrl,
        mp4Url: asset.mp4Url,
        thumbnailUrl: asset.thumbnailUrl,
        durationSeconds: asset.durationSeconds,
        error: asset.error,
        signedPlayback: asset.signedPlayback,
      }
    : null;

  const blockers = publishBlockers(movie, asset);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/library"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 transition hover:text-white"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to library
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-black tracking-[-0.03em] text-white">
              {movie.name}
            </h1>
            <MovieStatusBadge status={movie.status} />
          </div>
          <p className="mt-0.5 text-[12px] text-white/35">
            /{movie.slug}
            {movie.year ? ` · ${movie.year}` : ""}
            <span className="capitalize"> · {movie.kind}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/title/${movie.slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Public page
          </Link>
          <Link
            href={`/watch/${movie.slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-brand-hover"
          >
            <Play className="size-3.5" fill="currentColor" aria-hidden />
            Play
          </Link>
        </div>
      </div>

      <section
        className={
          blockers.length
            ? "rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4"
            : "rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4"
        }
      >
        <div className="flex items-center gap-2">
          {blockers.length ? (
            <AlertTriangle className="size-4 text-amber-300" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-300" aria-hidden />
          )}
          <h2
            className={
              blockers.length
                ? "text-[13px] font-semibold text-amber-100"
                : "text-[13px] font-semibold text-emerald-100"
            }
          >
            {blockers.length
              ? "Publish checklist"
              : movie.status === "published"
                ? "Published and ready"
                : "Ready to publish"}
          </h2>
        </div>
        {blockers.length ? (
          <ul className="mt-2.5 space-y-1.5">
            {blockers.map((blocker) => (
              <li
                key={blocker}
                className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-100/90"
              >
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-amber-300" aria-hidden />
                {blocker}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12px] leading-relaxed text-emerald-100/80">
            Rights are recorded and the stream is ready. You can set the status to
            published and save.
          </p>
        )}
      </section>

      <MovieForm
        mode="edit"
        movieId={movie.id}
        initial={initial}
        passThrough={passThrough}
        tmdbEnabled={tmdbConfigured()}
        canManageRights={canManageRights}
        canPublish={canPublish}
      />

      {canManageStream ? (
        <StreamPanel
          movieId={movie.id}
          kind={movie.kind}
          asset={streamAsset}
          cloudflareEnabled={cloudflareConfigured()}
          signingEnabled={cloudflareSigningConfigured()}
        />
      ) : (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold text-white">Stream</h2>
              <p className="mt-0.5 text-[11.5px] text-white/35">
                Read-only for moderators. An administrator manages uploads and playback
                URLs.
              </p>
            </div>
            {streamAsset ? (
              <StreamStatusBadge status={streamAsset.status} />
            ) : (
              <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/40">
                No stream
              </span>
            )}
          </div>
          {streamAsset ? (
            <dl className="mt-3 grid gap-2 text-[11.5px] sm:grid-cols-3">
              <div>
                <dt className="text-white/30">Provider</dt>
                <dd className="mt-0.5 capitalize text-white/70">{streamAsset.provider}</dd>
              </div>
              <div>
                <dt className="text-white/30">Playback</dt>
                <dd className="mt-0.5 text-white/70">
                  {streamAsset.hlsUrl || streamAsset.mp4Url ? "Attached" : "Missing"}
                </dd>
              </div>
              <div>
                <dt className="text-white/30">Signed playback</dt>
                <dd className="mt-0.5 text-white/70">
                  {streamAsset.signedPlayback ? "Enabled" : "Off"}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SubtitleManager
          movieId={movie.id}
          subtitles={subtitles.map((track) => ({
            id: track.id,
            language: track.language,
            label: track.label,
            url: track.url,
            isDefault: track.isDefault,
          }))}
        />
        {canDelete ? (
          <DeleteTitleButton movieId={movie.id} name={movie.name} />
        ) : (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <h2 className="text-[13px] font-semibold text-white">Deletion</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/35">
              Only an administrator can delete a title. Ask them to remove it if this
              draft is no longer needed.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
