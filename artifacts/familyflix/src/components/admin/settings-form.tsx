"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import type { SiteSettings } from "@/lib/admin/settings";

const inputClass =
  "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-55";
const areaClass =
  "w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-55";
const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";
const hintClass = "mt-1 text-[11px] leading-relaxed text-white/30";

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-white/85">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-brand px-0.5 transition disabled:opacity-50"
            : "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-white/15 px-0.5 transition disabled:opacity-50"
        }
      >
        <span
          className={
            checked
              ? "size-5 translate-x-5 rounded-full bg-white shadow transition"
              : "size-5 translate-x-0 rounded-full bg-white/80 shadow transition"
          }
        />
      </button>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">{description}</p>
      </div>
      <div className="grid gap-4 p-4">{children}</div>
    </section>
  );
}

export function SettingsForm({
  initial,
  editable,
}: {
  initial: SiteSettings;
  editable: boolean;
}) {
  const [saved, setSaved] = useState<SiteSettings>(initial);
  const [values, setValues] = useState<SiteSettings>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function update<K extends keyof SiteSettings>(
    section: K,
    key: keyof SiteSettings[K],
    value: SiteSettings[K][keyof SiteSettings[K]],
  ) {
    setJustSaved(false);
    setValues((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  }

  function reset() {
    setValues(saved);
    setError(null);
    setJustSaved(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return;

    setPending(true);
    setError(null);
    setJustSaved(false);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as {
        settings?: SiteSettings;
        error?: string;
      };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Could not save the settings.");
      }
      setSaved(payload.settings);
      setValues(payload.settings);
      setJustSaved(true);
      toast.success("Site settings saved.");
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not save the settings.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {!editable ? (
        <div className="flex gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-100">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Settings are read-only for moderators. Ask an administrator to make changes.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Site identity"
          description="The public name, tagline and support contact used across the service."
        >
          <div>
            <label htmlFor="settings-site-name" className={labelClass}>
              Site name
            </label>
            <input
              id="settings-site-name"
              type="text"
              maxLength={60}
              value={values.site.name}
              onChange={(event) => update("site", "name", event.target.value)}
              disabled={!editable}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-tagline" className={labelClass}>
              Tagline
            </label>
            <input
              id="settings-tagline"
              type="text"
              maxLength={160}
              value={values.site.tagline}
              onChange={(event) => update("site", "tagline", event.target.value)}
              disabled={!editable}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-support-email" className={labelClass}>
              Support email
            </label>
            <input
              id="settings-support-email"
              type="email"
              maxLength={160}
              value={values.site.supportEmail}
              onChange={(event) => update("site", "supportEmail", event.target.value)}
              disabled={!editable}
              className={inputClass}
            />
          </div>
        </Section>

        <Section
          title="Announcement banner"
          description="A dismissible strip shown above the public header."
        >
          <Toggle
            checked={values.announcement.enabled}
            onChange={(value) => update("announcement", "enabled", value)}
            label="Show announcement"
            description="Display the message to every visitor until they dismiss it."
            disabled={!editable}
          />
          <div>
            <label htmlFor="settings-announcement-message" className={labelClass}>
              Message
            </label>
            <textarea
              id="settings-announcement-message"
              rows={2}
              maxLength={240}
              value={values.announcement.message}
              onChange={(event) => update("announcement", "message", event.target.value)}
              disabled={!editable}
              className={areaClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-announcement-label" className={labelClass}>
                Link label
              </label>
              <input
                id="settings-announcement-label"
                type="text"
                maxLength={40}
                value={values.announcement.label}
                onChange={(event) => update("announcement", "label", event.target.value)}
                disabled={!editable}
                className={inputClass}
                placeholder="Browse"
              />
            </div>
            <div>
              <label htmlFor="settings-announcement-href" className={labelClass}>
                Link
              </label>
              <input
                id="settings-announcement-href"
                type="text"
                maxLength={300}
                value={values.announcement.href}
                onChange={(event) => update("announcement", "href", event.target.value)}
                disabled={!editable}
                className={inputClass}
                placeholder="/movies"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Maintenance mode"
          description="Show a full-screen notice on the public site while you work."
        >
          <Toggle
            checked={values.maintenance.enabled}
            onChange={(value) => update("maintenance", "enabled", value)}
            label="Enable maintenance mode"
            description="The admin console and APIs stay online. Public pages show the notice below."
            disabled={!editable}
          />
          <div>
            <label htmlFor="settings-maintenance-message" className={labelClass}>
              Notice
            </label>
            <textarea
              id="settings-maintenance-message"
              rows={3}
              maxLength={300}
              value={values.maintenance.message}
              onChange={(event) => update("maintenance", "message", event.target.value)}
              disabled={!editable}
              className={areaClass}
            />
            {values.maintenance.enabled ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300">
                <AlertCircle className="size-3.5" aria-hidden />
                Save to take the public site into maintenance.
              </p>
            ) : null}
          </div>
        </Section>

        <Section
          title="Playback & ads"
          description="Controls the player embed. Ads keep the service free."
        >
          <Toggle
            checked={values.playback.adsEnabled}
            onChange={(value) => update("playback", "adsEnabled", value)}
            label="Pre-roll ads"
            description="Play a sponsored break before the feature."
            disabled={!editable}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-ad-duration" className={labelClass}>
                Ad length (seconds)
              </label>
              <input
                id="settings-ad-duration"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={values.playback.adDurationSeconds}
                onChange={(event) =>
                  update("playback", "adDurationSeconds", Number(event.target.value) || 0)
                }
                disabled={!editable || !values.playback.adsEnabled}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="settings-ad-skip" className={labelClass}>
                Skip appears after (seconds)
              </label>
              <input
                id="settings-ad-skip"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={values.playback.adSkipAfterSeconds}
                onChange={(event) =>
                  update("playback", "adSkipAfterSeconds", Number(event.target.value) || 0)
                }
                disabled={!editable || !values.playback.adsEnabled}
                className={inputClass}
              />
              <p className={hintClass}>Must not be longer than the ad.</p>
            </div>
          </div>
          <Toggle
            checked={values.playback.trailersEnabled}
            onChange={(value) => update("playback", "trailersEnabled", value)}
            label="Trailer embeds"
            description="Allow the public trailer embed endpoint."
            disabled={!editable}
          />
        </Section>

        <Section
          title="Public access"
          description="Which public developer surfaces and embeds are served."
        >
          <div className="flex gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-relaxed text-white/45">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Public sign-ups stay closed. Every account is created by an
              administrator from the{" "}
              <a href="/admin/staff" className="text-white/70 underline underline-offset-2 hover:text-white">
                Staff
              </a>{" "}
              page.
            </span>
          </div>
          <Toggle
            checked={values.developer.apiEnabled}
            onChange={(value) => update("developer", "apiEnabled", value)}
            label="Developer catalog API"
            description="Serve /api/v1/titles to licensed partners."
            disabled={!editable}
          />
          <Toggle
            checked={values.developer.embedsEnabled}
            onChange={(value) => update("developer", "embedsEnabled", value)}
            label="Player & trailer embeds"
            description="Allow /embed/{slug} for partners. Turning this off also pauses the in-site watch page."
            disabled={!editable}
          />
        </Section>

        <Section
          title="Moderator rate limits"
          description="Applies only to moderator accounts. Administrators are not throttled."
        >
          <div>
            <label htmlFor="settings-moderator-writes" className={labelClass}>
              Metadata writes per 10 minutes
            </label>
            <input
              id="settings-moderator-writes"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={values.moderation.writesPer10Minutes}
              onChange={(event) =>
                update("moderation", "writesPer10Minutes", Number(event.target.value) || 1)
              }
              disabled={!editable}
              className={inputClass}
            />
            <p className={hintClass}>
              Creating and editing titles, subtitles and other catalog writes.
            </p>
          </div>
          <div>
            <label htmlFor="settings-moderator-imports" className={labelClass}>
              TMDb imports per 10 minutes
            </label>
            <input
              id="settings-moderator-imports"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={values.moderation.importsPer10Minutes}
              onChange={(event) =>
                update("moderation", "importsPer10Minutes", Number(event.target.value) || 1)
              }
              disabled={!editable}
              className={inputClass}
            />
            <p className={hintClass}>
              Search and detail lookups used by the TMDb import panel.
            </p>
          </div>
        </Section>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {editable ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.1] bg-[#0d0a17]/95 px-4 py-3 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
          <p className="flex flex-1 items-center gap-1.5 text-[11.5px] text-white/40">
            {justSaved && !dirty ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-300" aria-hidden />
                All settings saved.
              </>
            ) : dirty ? (
              "You have unsaved changes."
            ) : (
              "Changes apply to the public site within 15 seconds."
            )}
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </button>
          <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
