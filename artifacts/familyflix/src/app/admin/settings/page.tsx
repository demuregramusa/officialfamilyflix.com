import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { SettingsForm } from "@/components/admin/settings-form";
import { requireStaffPage } from "@/lib/admin-auth";
import { can, ROLE_LABELS } from "@/lib/admin/permissions";
import { getSettings } from "@/lib/admin/settings";
import {
  cloudflareConfigured,
  cloudflareSigningConfigured,
} from "@/lib/video/cloudflare";
import { tmdbConfigured } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

interface CheckItem {
  label: string;
  ok: boolean;
  description: string;
  env: string[];
}

export default async function AdminSettingsPage() {
  const session = await requireStaffPage("settings.view");
  const settings = await getSettings();
  const editable = can(session.user.role, "settings.manage");

  const checks: CheckItem[] = [
    {
      label: "Postgres database",
      ok: Boolean(process.env.DATABASE_URL),
      description: "Stores the catalog, streams, subtitles, settings and audit trail.",
      env: ["DATABASE_URL"],
    },
    {
      label: "Staff sessions",
      ok: Boolean(process.env.BETTER_AUTH_SECRET),
      description: "Signs session cookies for the admin and moderator console.",
      env: ["BETTER_AUTH_SECRET"],
    },
    {
      label: "Cloudflare Stream",
      ok: cloudflareConfigured(),
      description: "Direct uploads and automatic adaptive HLS transcoding.",
      env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_STREAM_API_TOKEN"],
    },
    {
      label: "Signed playback",
      ok: cloudflareSigningConfigured(),
      description: "Issues short-lived RS256 tokens so playback URLs expire.",
      env: ["CLOUDFLARE_STREAM_SIGNING_KEY_ID", "CLOUDFLARE_STREAM_SIGNING_KEY"],
    },
    {
      label: "TMDb metadata",
      ok: tmdbConfigured(),
      description: "Search and import artwork, cast and synopsis by title.",
      env: ["TMDB_API_KEY", "TMDB_READ_ACCESS_TOKEN"],
    },
  ];

  const configured = checks.filter((check) => check.ok).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
            Control panel
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
            Site settings
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
            Configure the public site, player, access and moderator limits. Changes
            are saved to the database and audited.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60">
          <ShieldCheck className="size-3.5" aria-hidden />
          {ROLE_LABELS[session.user.role]} · {editable ? "can edit" : "read only"}
        </span>
      </div>

      <SettingsForm initial={settings} editable={editable} />

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold text-white">
              Environment &amp; services
            </h2>
            <p className="mt-0.5 text-[11.5px] text-white/35">
              {configured} of {checks.length} services configured. Secrets stay in the
              server environment and are never displayed.
            </p>
          </div>
          <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Read only
          </span>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-3 px-4 py-3">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-white/25" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-white/85">
                  {check.label}
                  <span
                    className={
                      check.ok
                        ? "rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200"
                        : "rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50"
                    }
                  >
                    {check.ok ? "Configured" : "Missing"}
                  </span>
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/40">
                  {check.description}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {check.env.map((name) => (
                    <code
                      key={name}
                      className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10.5px] text-white/50"
                    >
                      {name}
                    </code>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Webhook className="size-4 text-white/50" aria-hidden />
            Processing webhook
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
            When a Cloudflare upload finishes transcoding, point its webhook here so
            the stream flips to ready without a manual sync.
          </p>
          <code className="mt-2 block select-all break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/60">
            /api/webhooks/cloudflare-stream
          </code>
          <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
            Optionally set CLOUDFLARE_STREAM_WEBHOOK_SECRET and send it as the
            <span className="mx-1 font-mono text-white/45">x-webhook-secret</span>
            header.
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <KeyRound className="size-4 text-white/50" aria-hidden />
            Environment names
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
            Copy the names into your environment file. Secrets stay on the server.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10.5px] leading-relaxed text-white/55">
{`DATABASE_URL=
BETTER_AUTH_SECRET=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_API_TOKEN=
CLOUDFLARE_STREAM_SIGNING_KEY_ID=
CLOUDFLARE_STREAM_SIGNING_KEY=
TMDB_API_KEY=`}
          </pre>
          <p className="mt-2 flex items-center gap-1 text-[10.5px] text-white/30">
            <Copy className="size-3" aria-hidden />
            Paste keys from the provider dashboards.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <p className="flex-1 text-[12px] text-white/45">
          Need the full licensing workflow? Review the catalog and confirm rights on
          each title before publishing.
        </p>
        <Link
          href="/admin/library"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
        >
          Open library
          <ExternalLink className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
