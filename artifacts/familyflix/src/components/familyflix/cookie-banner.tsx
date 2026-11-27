import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, ShieldCheck, X } from "lucide-react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    try {
      const consent = localStorage.getItem("familyflix-cookie-consent");
      if (!consent) {
        // Small delay so it animates in smoothly after initial paint
        timer = setTimeout(() => setVisible(true), 1200);
      }
    } catch {
      // Ignore localStorage errors in private browsing
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("familyflix-cookie-consent", JSON.stringify({
        essential: true,
        advertising: true,
        analytics: true,
        timestamp: new Date().toISOString(),
      }));
    } catch {}
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem("familyflix-cookie-consent", JSON.stringify({
        essential: true,
        advertising: false,
        analytics: false,
        timestamp: new Date().toISOString(),
      }));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-4xl animate-fade-up sm:bottom-6 sm:left-6 sm:right-6"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-[#12161b]/95 p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-600/25 text-purple-400 border border-purple-500/30">
            <Cookie className="size-5" />
          </div>
          <div className="text-xs text-white/80 leading-relaxed">
            <p className="font-semibold text-white">
              FamilyFlix Cookie & Ad Transparency Notice
            </p>
            <p className="mt-0.5 text-white/60">
              We use cookies and verified advertising partners (like Google AdSense and programmatic AVOD networks) to keep movies 100% free to stream. View our{" "}
              <Link href="/privacy" className="font-medium text-purple-400 underline hover:text-purple-300">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="font-medium text-purple-400 underline hover:text-purple-300">
                Terms of Use
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:brightness-110 active:scale-95"
          >
            <ShieldCheck className="size-3.5" />
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
