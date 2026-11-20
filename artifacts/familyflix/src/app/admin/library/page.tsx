import Image from "next/image";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { MovieStatusBadge, StreamStatusBadge } from "@/components/admin/status-badge";
import { requireStaffPage } from "@/lib/admin-auth";
import { listAdminMovies } from "@/lib/admin/movies";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["all", "published", "draft", "archived"] as const;
const KIND_FILTERS = ["all", "movie", "series", "live"] as const;

function thumbUrl(row: { posterUrl: string | null; imageId: string | null }) {
  if (row.posterUrl) return row.posterUrl;
  if (row.imageId) {
    return `https://images.unsplash.com/${row.imageId}?auto=format&fit=crop&w=120&h=180&q=60`;
  }
  return null;
}

function buildQuery(params: { q?: string; status?: string; kind?: string }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.kind && params.kind !== "all") query.set("kind", params.kind);
  const value = query.toString();
  return value ? `/admin/library?${value}` : "/admin/library";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function AdminLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; kind?: string }>;
}) {
  await requireStaffPage("library.view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = STATUS_FILTERS.includes(params.status as (typeof STATUS_FILTERS)[number])
    ? (params.status as string)
    : "all";
  const kind = KIND_FILTERS.includes(params.kind as (typeof KIND_FILTERS)[number])
    ? (params.kind as string)
    : "all";

  const rows = await listAdminMovies({
    query: q || undefined,
    status: status === "all" ? undefined : (status as "draft" | "published" | "archived"),
    kind: kind === "all" ? undefined : (kind as "movie" | "series" | "live"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
            Catalog
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
            Library
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            {rows.length} {rows.length === 1 ? "title" : "titles"} shown
            {q ? ` for “${q}”` : ""}.
          </p>
        </div>
        <Link
          href="/admin/library/new"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Plus className="size-4" aria-hidden />
          Add title
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between">
        <form action="/admin/library" className="flex w-full max-w-sm items-center gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search titles or slugs"
              aria-label="Search titles"
              className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-[13px] text-white placeholder:text-white/25 focus:border-[#8b5cff] focus:outline-none focus:ring-4 focus:ring-brand/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-white/15 px-4 text-[12.5px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((value) => (
            <Link
              key={value}
              href={buildQuery({ q, status: value, kind })}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-[11.5px] font-medium capitalize transition-colors",
                status === value
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white",
              )}
            >
              {value}
            </Link>
          ))}
          <span className="mx-1 w-px self-stretch bg-white/10" aria-hidden />
          {KIND_FILTERS.map((value) => (
            <Link
              key={value}
              href={buildQuery({ q, status, kind: value })}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-[11.5px] font-medium capitalize transition-colors",
                kind === value
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/75",
              )}
            >
              {value === "all" ? "All types" : value}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
          <h2 className="text-[15px] font-semibold text-white">No titles found</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-white/40">
            Try a different search or filter, or add a new title to the catalog.
          </p>
          <Link
            href="/admin/library/new"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden />
            Add title
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30">
                  <th className="px-4 py-3 font-bold">Title</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Stream</th>
                  <th className="px-4 py-3 font-bold">Updated</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((row) => {
                  const poster = thumbUrl(row);
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-[54px] w-9 shrink-0 overflow-hidden rounded bg-white/[0.06]">
                            {poster ? (
                              <Image
                                src={poster}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-white">
                              {row.name}
                            </p>
                            <p className="truncate text-[11px] text-white/30">
                              {row.slug}
                              {row.year ? ` · ${row.year}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] capitalize text-white/55">
                        {row.kind}
                      </td>
                      <td className="px-4 py-3">
                        <MovieStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StreamStatusBadge
                          status={row.assetStatus}
                          provider={row.assetProvider}
                        />
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-white/40">
                        {formatDate(row.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/library/${row.id}`}
                          className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {rows.map((row) => {
              const poster = thumbUrl(row);
              return (
                <li key={row.id}>
                  <Link
                    href={`/admin/library/${row.id}`}
                    className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-white/15"
                  >
                    <div className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded bg-white/[0.06]">
                      {poster ? (
                        <Image
                          src={poster}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white">
                        {row.name}
                      </p>
                      <p className="mt-0.5 text-[11px] capitalize text-white/30">
                        {row.kind} · {row.year ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <MovieStatusBadge status={row.status} />
                        <StreamStatusBadge
                          status={row.assetStatus}
                          provider={row.assetProvider}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
