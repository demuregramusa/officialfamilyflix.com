"use client";

import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; body: string; milliseconds: number }
  | { status: "error"; message: string };

export function ApiPlayground() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function run() {
    setState({ status: "loading" });
    const started = performance.now();

    try {
      const response = await fetch("/api/v1/titles?limit=3&sort=score", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      const milliseconds = Math.round(performance.now() - started);

      if (!response.ok) {
        setState({
          status: "error",
          message:
            payload.error?.message ??
            `The API returned ${response.status}. Try again in a moment.`,
        });
        return;
      }

      setState({
        status: "success",
        body: JSON.stringify(payload, null, 2),
        milliseconds,
      });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the API. Check your connection and try again.",
      });
    }
  }

  const loading = state.status === "loading";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-white">Try the public API</h3>
          <p className="mt-1 text-[12px] text-white/45">
            One live request, no key required.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08060f]"
        >
          {loading ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Running…
            </>
          ) : state.status === "success" ? (
            <>
              <RotateCcw className="size-3.5" aria-hidden />
              Run again
            </>
          ) : (
            <>
              <Play className="size-3.5" fill="currentColor" aria-hidden />
              Send request
            </>
          )}
        </button>
      </div>

      <div aria-live="polite" className="mt-4">
        {state.status === "idle" ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[12px] text-white/35">
            The response appears here.
          </p>
        ) : state.status === "loading" ? (
          <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#06040b] p-4">
            <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        ) : state.status === "error" ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4">
            <p className="text-[12.5px] font-semibold text-red-200">
              Request failed
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-red-200/70">
              {state.message}
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[11px] font-medium text-emerald-300/80">
              200 OK · {state.milliseconds} ms
            </p>
            <pre className="max-h-[340px] overflow-auto rounded-xl border border-white/[0.08] bg-[#06040b] p-4 text-[11.5px] leading-relaxed text-white/65">
              <code>{state.body}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
