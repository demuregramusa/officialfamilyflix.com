import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Library, ShieldCheck, Tv, Users } from "lucide-react";

import { companyAddress, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "FamilyFlix is a free, ad-supported streaming service bringing classic films, TV shows and licensed titles to families everywhere. Learn about our company, mission and reach.",
  alternates: { canonical: "/about" },
};

const facts = [
  { label: "Founded", value: "2026" },
  { label: "Headquarters", value: "Los Angeles, CA" },
  { label: "Price", value: "$0, always" },
  { label: "Support", value: "24/7" },
];

const offerings = [
  {
    icon: Clapperboard,
    title: "Movies",
    description:
      "Comedy, drama, horror, romance, adventure and family favorites — curated and streaming in HD.",
  },
  {
    icon: Tv,
    title: "TV shows",
    description:
      "Full seasons of licensed series, added to the catalog as rights are secured.",
  },
  {
    icon: Library,
    title: "Classics library",
    description:
      "Timeless public-domain and Creative Commons films from the Internet Archive, free to watch forever.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pt-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b79dff]">
        About FamilyFlix
      </p>
      <h1 className="mt-3 max-w-[18ch] text-balance text-[clamp(2.3rem,6vw,4.4rem)] font-black uppercase leading-[0.9] tracking-[-0.045em] text-white">
        Free TV for every family.
      </h1>
      <p className="mt-5 max-w-[68ch] text-[15px] leading-relaxed text-white/60">
        FamilyFlix is a free, ad-supported streaming service built for the whole
        household. We bring together classic public-domain films, Creative
        Commons favorites and licensed titles in one place — no subscription, no
        credit card, no hidden fees.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
          >
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/35">
              {fact.label}
            </dt>
            <dd className="mt-1.5 text-[15px] font-bold text-white">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Our mission
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            Great entertainment should not come with a monthly bill. FamilyFlix
            was founded in 2026 with a simple idea: make a broad, high-quality
            streaming library available to every family for free, supported by
            advertising instead of subscriptions.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60">
            We curate every row with families in mind, keep the experience
            simple, and invest in the technology that makes free streaming feel
            premium. From the first trailer to the last credit, our job is to
            make movie night easy.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {offerings.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <item.icon className="size-5 text-[#b79dff]" aria-hidden />
                <h3 className="mt-3 text-[13.5px] font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-[12px] font-medium text-white/60">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden />
              Ad-supported, never paywalled
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-[12px] font-medium text-white/60">
              <Users className="size-4 text-[#b79dff]" aria-hidden />
              Built for the whole household
            </span>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Company information
          </h2>
          <dl className="mt-4 space-y-4 text-[13px] leading-relaxed">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-white/30">
                Legal name
              </dt>
              <dd className="mt-0.5 font-semibold text-white">{site.legalName}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-white/30">
                Headquarters
              </dt>
              <dd className="mt-0.5 text-white/60">{companyAddress}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-white/30">
                Website
              </dt>
              <dd className="mt-0.5 text-white/60">www.familyflix.com</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-white/30">
                Contact
              </dt>
              <dd className="mt-0.5 text-white/60">
                <a
                  href={`mailto:${site.contact.support}`}
                  className="transition-colors hover:text-white"
                >
                  {site.contact.support}
                </a>
                <br />
                <a
                  href={`tel:${site.contact.phoneHref}`}
                  className="transition-colors hover:text-white"
                >
                  {site.contact.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-white/30">
                Founded
              </dt>
              <dd className="mt-0.5 text-white/60">{site.foundedYear}</dd>
            </div>
          </dl>

          <Link
            href="/contact"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08060f]"
          >
            Contact FamilyFlix
          </Link>
          <p className="mt-4 text-[11px] leading-relaxed text-white/30">
            {site.name} is operated by {site.legalName}, a company registered in
            the United States.
          </p>
        </aside>
      </div>

      <div className="mt-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-7 sm:px-8">
        <h2 className="text-[18px] font-bold text-white">
          Press, partnerships and advertising
        </h2>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-white/50">
          For press enquiries, brand partnerships or advertising opportunities,
          reach the right team through our contact page. We work with advertisers
          who respect family audiences and keep the service free.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
          <a
            href={`mailto:${site.contact.press}`}
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            {site.contact.press}
          </a>
          <a
            href={`mailto:${site.contact.advertising}`}
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            {site.contact.advertising}
          </a>
        </div>
      </div>
    </div>
  );
}
