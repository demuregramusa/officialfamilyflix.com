"use client";

import { useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ROLE_LABELS, type StaffRole } from "@/lib/admin/permissions";
import type { StaffMember } from "@/lib/admin/staff";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";
const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function StaffManager({
  initial,
  currentUserId,
}: {
  initial: StaffMember[];
  currentUserId: string;
}) {
  const [staff, setStaff] = useState(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("moderator");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    if (password.length < 10) {
      setCreateError("Use at least 10 characters for the temporary password.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const payload = (await response.json()) as {
        staff?: StaffMember;
        error?: string;
      };
      if (!response.ok || !payload.staff) {
        throw new Error(payload.error ?? "Could not create the staff account.");
      }
      setStaff((current) => [...current, payload.staff as StaffMember]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("moderator");
      toast.success(`${payload.staff.name} can now sign in as a ${ROLE_LABELS[payload.staff.role].toLowerCase()}.`);
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not create the staff account.";
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  function replaceRow(updated: StaffMember) {
    setStaff((current) =>
      current.map((member) => (member.id === updated.id ? updated : member)),
    );
  }

  async function patchStaff(
    target: StaffMember,
    body: Record<string, unknown>,
  ): Promise<StaffMember | null> {
    setRowBusy(target.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/staff/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update the account.");

      const updated: StaffMember =
        body.action === "role"
          ? { ...target, role: body.role as StaffRole }
          : body.action === "ban"
            ? { ...target, banned: true, banReason: (body.reason as string) || "Suspended" }
            : { ...target, banned: false, banReason: null };
      replaceRow(updated);
      return updated;
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not update the account.";
      setActionError(message);
      toast.error(message);
      return null;
    } finally {
      setRowBusy(null);
    }
  }

  async function changeRole(member: StaffMember, next: StaffRole) {
    if (next === member.role) return;
    const updated = await patchStaff(member, { action: "role", role: next });
    if (updated) {
      toast.success(`${updated.name} is now a ${ROLE_LABELS[next].toLowerCase()}.`);
    }
  }

  async function submitBan(member: StaffMember) {
    const updated = await patchStaff(member, {
      action: "ban",
      reason: banReason.trim(),
    });
    if (updated) {
      setBanTarget(null);
      setBanReason("");
      toast.success(`${updated.name} has been suspended.`);
    }
  }

  async function unban(member: StaffMember) {
    const updated = await patchStaff(member, { action: "unban" });
    if (updated) toast.success(`${updated.name} can sign in again.`);
  }

  async function resetPassword(member: StaffMember) {
    if (passwordValue.length < 10) {
      setActionError("Use at least 10 characters for the new password.");
      return;
    }
    setRowBusy(member.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", password: passwordValue }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update the password.");
      }
      setPasswordTarget(null);
      setPasswordValue("");
      toast.success(`Password updated for ${member.name}.`);
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not update the password.";
      setActionError(message);
      toast.error(message);
    } finally {
      setRowBusy(null);
    }
  }

  async function remove(member: StaffMember) {
    setRowBusy(member.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/staff/${member.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete the account.");
      setStaff((current) => current.filter((row) => row.id !== member.id));
      setDeleteTarget(null);
      toast.success(`${member.name} was removed.`);
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not delete the account.";
      setActionError(message);
      toast.error(message);
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Plus className="size-4 text-white/50" aria-hidden />
            Add a staff account
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">
            Sign-ups are closed. Create the account here, share the temporary password,
            and ask the person to change it after signing in.
          </p>
        </div>
        <form onSubmit={createStaff} className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="staff-name" className={labelClass}>
              Name
            </label>
            <input
              id="staff-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Jordan Lee"
            />
          </div>
          <div>
            <label htmlFor="staff-email" className={labelClass}>
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              maxLength={160}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="jordan@familyflix.com"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className={labelClass}>
              Temporary password
            </label>
            <input
              id="staff-password"
              type="text"
              required
              minLength={10}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="At least 10 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="staff-role" className={labelClass}>
              Role
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              className={inputClass}
            >
              <option value="moderator">Moderator — restricted + rate limited</option>
              <option value="admin">Administrator — full access</option>
            </select>
          </div>

          {createError ? (
            <p
              role="alert"
              className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200 sm:col-span-2"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {createError}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              {creating ? "Creating…" : "Create staff account"}
            </button>
          </div>
        </form>
      </section>

      {actionError ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {actionError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-white">
            Staff ({staff.length})
          </h2>
          <p className="mt-0.5 text-[11.5px] text-white/35">
            Suspending or deleting an administrator is blocked when it would leave the
            console without one.
          </p>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {staff.map((member) => {
            const isSelf = member.id === currentUserId;
            const busy = rowBusy === member.id;
            return (
              <li key={member.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55">
                    <UserRound className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-white">
                      {member.name}
                      {isSelf ? (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                          You
                        </span>
                      ) : null}
                      {member.banned ? (
                        <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                          Suspended
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11.5px] text-white/40">{member.email}</p>
                    <p className="mt-0.5 text-[10.5px] text-white/25">
                      Added {formatDate(member.createdAt)}
                      {member.banReason ? ` · ${member.banReason}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      Role for {member.name}
                    </label>
                    <select
                      id={`role-${member.id}`}
                      value={member.role}
                      disabled={busy || isSelf}
                      onChange={(event) =>
                        changeRole(member, event.target.value as StaffRole)
                      }
                      className="h-9 rounded-lg border border-white/12 bg-[#0b0813] px-2.5 text-[11.5px] font-medium text-white/80 disabled:opacity-40"
                    >
                      <option value="moderator">Moderator</option>
                      <option value="admin">Administrator</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setPasswordTarget(
                          passwordTarget === member.id ? null : member.id,
                        );
                        setPasswordValue("");
                      }}
                      disabled={busy}
                      aria-label={`Set password for ${member.name}`}
                      title={isSelf ? "Change your password" : "Reset password"}
                      className="grid size-9 place-items-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <KeyRound className="size-3.5" aria-hidden />
                    </button>

                    {member.banned ? (
                      <button
                        type="button"
                        onClick={() => unban(member)}
                        disabled={busy}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 text-[11.5px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="size-3.5" aria-hidden />
                        )}
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setBanTarget(banTarget === member.id ? null : member.id);
                          setBanReason("");
                        }}
                        disabled={busy || isSelf}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11.5px] font-semibold text-white/60 transition hover:border-amber-300/40 hover:text-amber-200 disabled:opacity-40"
                      >
                        <Ban className="size-3.5" aria-hidden />
                        Suspend
                      </button>
                    )}

                    {deleteTarget === member.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => remove(member)}
                          disabled={busy}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-500 px-3 text-[11.5px] font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-3.5" aria-hidden />
                          )}
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(null)}
                          className="grid size-9 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                          aria-label="Cancel delete"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(member.id)}
                        disabled={busy || isSelf}
                        aria-label={`Delete ${member.name}`}
                        className="grid size-9 place-items-center rounded-full text-white/35 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-30"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>

                {banTarget === member.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
                    <div className="min-w-[200px] flex-1">
                      <label
                        htmlFor={`ban-reason-${member.id}`}
                        className={labelClass}
                      >
                        Reason (optional)
                      </label>
                      <input
                        id={`ban-reason-${member.id}`}
                        type="text"
                        maxLength={200}
                        value={banReason}
                        onChange={(event) => setBanReason(event.target.value)}
                        className={inputClass}
                        placeholder="Shared account, policy breach…"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => submitBan(member)}
                      disabled={busy}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-amber-400 px-4 text-[12px] font-bold text-black transition hover:bg-amber-300 disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Ban className="size-4" aria-hidden />
                      )}
                      Suspend account
                    </button>
                  </div>
                ) : null}

                {passwordTarget === member.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="min-w-[200px] flex-1">
                      <label
                        htmlFor={`password-${member.id}`}
                        className={labelClass}
                      >
                        New password{isSelf ? " (your own account)" : ""}
                      </label>
                      <input
                        id={`password-${member.id}`}
                        type="password"
                        minLength={10}
                        maxLength={128}
                        value={passwordValue}
                        onChange={(event) => setPasswordValue(event.target.value)}
                        className={inputClass}
                        placeholder="At least 10 characters"
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => resetPassword(member)}
                      disabled={busy}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <KeyRound className="size-4" aria-hidden />
                      )}
                      Set password
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <div className={cn("flex gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] px-4 py-3 text-[11.5px] leading-relaxed text-emerald-100/80")}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
        Every staff change is recorded in the activity log with the actor, role and
        reason.
      </div>
    </div>
  );
}
