"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, RefreshCw, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";

import { FamilyFlixLogo } from "@/components/familyflix/logo";
import type { PublicSiteConfig } from "@/lib/admin/settings";

export function SiteNotice() {
  const [config, setConfig] = useState<PublicSiteConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PublicSiteConfig | null) => {
        if (!cancelled && payload) setConfig(payload);
      })
      .catch(() => {
        // The public site still works if the config endpoint is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config?.maintenance.enabled) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [config?.maintenance.enabled]);

  const storageKey = config
    ? `familyflix:announcement:${config.announcement.message}`
    : "";

  useEffect(() => {
    if (!storageKey) return;
    try {
      setDismissed(window.sessionStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      if (storageKey) window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Session storage can be blocked; dismissal still works for this view.
    }
  }

  if (!config) return null;

  if (config.maintenance.enabled) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Maintenance"
        className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#0c1014] px-5 py-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, rgba(109,40,255,0.28) 0%, transparent 70%)",
          }}
        />
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] sm:p-8">
          <div className="flex justify-center">
            <FamilyFlixLogo />
          </div>
          {config.tagline ? (
            <p className="mt-2 text-[11.5px] text-white/35">{config.tagline}</p>
          ) : null}
          <span className="mx-auto mt-5 grid size-11 place-items-center rounded-full border border-[#b79dff]/30 bg-[#6d28ff]/15 text-[#c9b8ff]">
            <Wrench className="size-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-[22px] font-black tracking-[-0.03em] text-white">
            We&apos;ll be right back
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/50">
            {config.maintenance.message}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-bold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </button>
            <Link
              href="/auth/sign-in"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[12.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Staff sign in
            </Link>
          </div>
          <p className="mt-4 text-[10.5px] text-white/25">
            {config.siteName} · maintenance mode
            {config.supportEmail ? (
              <>
                {" · "}
                <a
                  href={`mailto:${config.supportEmail}`}
                  className="underline decoration-white/20 underline-offset-2 hover:text-white/50"
                >
                  {config.supportEmail}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  if (!config.announcement.enabled || !config.announcement.message || dismissed) {
    return null;
  }

  const { announcement } = config;

  return (
    <div
      role="status"
      className="relative z-[60] border-b border-white/10 bg-brand text-white"
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-2 sm:px-6 md:px-8 xl:px-12">
        <Megaphone className="hidden size-3.5 shrink-0 sm:block" aria-hidden />
        <p className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug sm:text-[12px]">
          {announcement.message}
        </p>
        {announcement.href && announcement.label ? (
          <Link
            href={announcement.href}
            className="hidden h-7 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[11px] font-bold text-black transition hover:bg-white/90 sm:inline-flex"
          >
            {announcement.label}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
