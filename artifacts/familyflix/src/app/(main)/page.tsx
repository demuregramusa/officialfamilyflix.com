import Link from "next/link";
import { Play } from "lucide-react";

import { Hero } from "@/components/familyflix/hero";
import { PosterCard, posterSize } from "@/components/familyflix/poster-card";
import { TitleRow } from "@/components/familyflix/title-row";
import { featuredTitles, getTitles, homeSections } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="pb-2">
      <Hero titles={featuredTitles} />

      <div className="relative z-10 mt-5 space-y-9 md:mt-7 md:space-y-11">
        {homeSections.map((section) => (
          <TitleRow
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            seeAllHref="/movies"
          >
            {getTitles(section.slugs).map((title) => (
              <PosterCard key={title.slug} title={title} className={posterSize} />
            ))}
          </TitleRow>
        ))}

        <section className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 md:px-8 xl:px-12">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#1a0b3f] via-[#120a24] to-[#0b0714] px-5 py-7 sm:px-8 sm:py-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-brand/35 blur-[90px]"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#b79dff]">
                  Always free
                </p>
                <h2 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.03em] text-white sm:text-[30px]">
                  No subscription. No credit card.
                </h2>
                <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-white/55">
                  Classic public-domain films and your licensed library, ready to
                  stream. Ads keep it free for everyone.
                </p>
              </div>
              <Link
                href="/movies"
                className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Play className="size-4" fill="currentColor" aria-hidden />
                Browse movies
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
