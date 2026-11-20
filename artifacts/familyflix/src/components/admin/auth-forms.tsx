"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-[14px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";

const labelClass = "block text-[12px] font-semibold text-white/70";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });

    if (result.error) {
      setError(result.error.message ?? "Sign-in failed. Check your email and password.");
      setPending(false);
      return;
    }

    const target = redirectTo.startsWith("/admin") ? redirectTo : "/admin";
    router.replace(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-white">
          Admin sign in
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">
          Manage the catalog, video assets and licensing records.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="you@familyflix.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          placeholder="Your password"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-5 text-[13.5px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Use at least 10 characters for the password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Could not create the admin account.");
      setPending(false);
      return;
    }

    setCreated(true);
    router.refresh();
  }

  if (created) {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-white">
          Admin account created
        </h1>
        <p className="text-[13px] leading-relaxed text-white/50">
          Sign in with your new credentials to open the dashboard.
        </p>
        <a
          href="/auth/sign-in"
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-5 text-[13.5px] font-semibold text-white transition hover:bg-brand-hover"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-white">
          Create the admin account
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">
          This is the first account, so it receives full admin access.
          Sign-up closes automatically afterwards.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="you@familyflix.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          placeholder="At least 10 characters"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
          placeholder="Repeat the password"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-5 text-[13.5px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create admin account"}
      </button>

      <p className="text-[11.5px] leading-relaxed text-white/30">
        Use a unique password and store it in your password manager. There is no
        password reset email configured yet.
      </p>
    </form>
  );
}
