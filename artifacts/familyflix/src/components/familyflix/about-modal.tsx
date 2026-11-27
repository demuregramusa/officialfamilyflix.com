import React from "react";
import {
  X,
  Building2,
  Sparkles,
  ShieldCheck,
  Code,
  Tv,
  Users,
  Award,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  Layers,
  Rocket,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscribe?: () => void;
}

export function AboutModal({ isOpen, onClose, onOpenSubscribe }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0914] text-white shadow-2xl p-6 sm:p-8 md:p-10 space-y-8 custom-scrollbar">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header & Badges */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Official DemureGram Foundation Presentation
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white">
            About FamilyFlix
            <span className="block text-xl sm:text-2xl font-bold text-purple-400 normal-case tracking-normal mt-1">
              By DemureGram
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
            Free, family-first entertainment and developer technology for the modern era.
            Where timeless cinematic heritage meets high-speed cloud infrastructure.
          </p>
        </div>

        {/* Company History & Transition */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Our Heritage & Executive Leadership</h2>
              <p className="text-xs text-white/50">Founded in 2023 · Rebranded to FamilyFlix in 2026</p>
            </div>
          </div>
          <div className="text-sm text-white/80 leading-relaxed space-y-3">
            <p>
              FamilyFlix was originally established in <strong>2023</strong> under the founding name <strong>Movie Source</strong>. 
              The company was built with a pioneering dedication to cataloging, preserving, and distributing world-class classic films and public-domain cinematic masterpieces.
            </p>
            <p>
              Following the disability of founding visionary <strong>Princeton T. Taylor</strong> in 2026, the complete business operations, intellectual property, and institutional assets were formally entrusted and transferred over to <strong>Prisandra T. Taylor</strong>.
            </p>
            <p>
              Under her dynamic executive direction as <strong>Founder &amp; CEO</strong> over the Foundation, the enterprise completed its transformative rebranding from <em>Movie Source</em> to <strong>FamilyFlix</strong> and forged an exclusive global partnership with <strong>DemureGram</strong>.
            </p>
          </div>
        </div>

        {/* What DemureGram Is & What We Offer */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold text-sm uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              What Is DemureGram?
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1014]">
              <img
                src="/avatars/demure/demure-familyflix-crew.jpg"
                alt="Demure FamilyFlix 3D cinema crew sharing popcorn and a glowing clapperboard"
                loading="lazy"
                className="aspect-video w-full object-cover object-top"
              />
            </div>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              <strong>DemureGram</strong> is a forward-thinking digital media, software, and artificial intelligence foundation. 
              We build ethical, human-centered digital experiences that connect families, creators, and developers worldwide.
            </p>
            <div className="pt-1 text-xs text-[#00d2ff] font-semibold flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> Building into the future with multiple new products to come.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-[#00d2ff] font-bold text-sm uppercase tracking-wide">
              <Tv className="w-4 h-4 text-[#0095f6]" />
              What We Offer
            </div>
            <ul className="text-xs sm:text-sm text-white/75 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00d2ff] shrink-0" />
                <span><strong>23,270+ Titles</strong> curated across 44 genres</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00d2ff] shrink-0" />
                <span><strong>100% Free Streaming</strong> in HD with verified rights</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00d2ff] shrink-0" />
                <span><strong>Developer API Platform</strong> for apps and researchers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00d2ff] shrink-0" />
                <span><strong>Tubi-Inspired Player</strong> with resume timestamps</span>
              </li>
            </ul>
          </div>
        </div>

        {/* User Joining & Subscription Offerings */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* For Families / Viewers */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0095f6]/15 via-[#12161b] to-[#0c1014] p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Users className="w-5 h-5 text-[#00d2ff]" />
              For Families &amp; Viewers
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              FamilyFlix is <strong>always free</strong>. No credit card or payment is ever required to watch our full catalog.
            </p>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• Create free profiles for adults and kids with 24+ custom 3D Demure &amp; Family avatars.</li>
              <li>• Sync your Watchlist and Continue Watching across all devices.</li>
              <li>• Optional VIP Supporter Pass ($4.99/mo) for 100% ad-free 4K viewing.</li>
            </ul>
            {onOpenSubscribe && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscribe();
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-purple-200"
              >
                Learn about VIP Supporter Pass <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* For Developers */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-black/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Code className="w-5 h-5 text-blue-400" />
              For Developers &amp; Partners
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Build your own streaming apps, recommendations, and cinema portals with the <strong>FamilyFlix Developer Platform</strong>.
            </p>
            <div className="space-y-1.5 text-xs text-white/70">
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white">Starter Tier:</span> Free · 1,000 monthly API calls
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white">Pro Tier ($29/mo):</span> 100,000 calls · Webhooks · Priority SLA
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white">Enterprise ($199/mo):</span> Unlimited calls · Dedicated support
              </div>
            </div>
            <a
              href="/developers"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 pt-1"
            >
              Explore Developer Portal <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Legal & Governance */}
        <div className="border-t border-white/10 pt-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between text-xs text-white/40">
          <div>
            © 2026 FamilyFlix By DemureGram Foundation. All rights reserved.
          </div>
          <div className="mt-2 sm:mt-0 flex items-center justify-center gap-4">
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="mailto:support@familyflix.demuregram.com" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
