import Link from "next/link";
import { Activity, Search } from "lucide-react";

import { requireStaffPage } from "@/lib/admin-auth";
import {
  ACTION_LABELS,
  auditLabel,
  listAudit,
  summarizeDetail,
} from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string }>;
}) {
  await requireStaffPage("audit.view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const action = params.action?.trim() ?? "";

  const entries = await listAudit({ query: q || undefined, action: action || undefined });
  const actions = Object.keys(ACTION_LABELS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
            Oversight
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
            Activity log
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
            Every catalog, stream, settings and staff change is recorded with the
            account that made it.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60">
          <Activity className="size-3.5" aria-hidden />
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <form
        action="/admin/activity"
        className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Filter by staff email or action"
            aria-label="Filter activity"
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-[13px] text-white placeholder:text-white/25 focus:border-[#8b5cff] focus:outline-none focus:ring-4 focus:ring-brand/20"
          />
        </div>
        <select
          name="action"
          defaultValue={action}
          aria-label="Action type"
          className="h-10 rounded-full border border-white/10 bg-[#0b0813] px-3 text-[12px] text-white/75 focus:border-[#8b5cff] focus:outline-none"
        >
          <option value="">All actions</option>
          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-full border border-white/15 px-4 text-[12.5px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
        >
          Filter
        </button>
        {q || action ? (
          <Link
            href="/admin/activity"
            className="inline-flex h-10 items-center rounded-full px-3 text-[12px] text-white/40 transition hover:text-white"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
          <h2 className="text-[15px] font-semibold text-white">No activity found</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-white/40">
            Nothing matches this filter. Clear the filters or make a change in the
            library.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10.5px] uppercase tracking-[0.12em] text-white/30">
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Staff</th>
                <th className="px-4 py-2.5 font-semibold">Action</th>
                <th className="px-4 py-2.5 font-semibold">Entity</th>
                <th className="px-4 py-2.5 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-[11.5px] text-white/40">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[11.5px] text-white/70">
                    {entry.userEmail ?? "System"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-medium text-white/85">
                      {auditLabel(entry.action)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-white/30">
                      {entry.action}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[11.5px] capitalize text-white/45">
                    {entry.entity}
                    {entry.entityId ? (
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-white/25">
                        {entry.entityId.slice(0, 12)}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-[11px] leading-relaxed text-white/35">
                    <span className="line-clamp-2 break-words">
                      {summarizeDetail(entry.detail) || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
