import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Code2,
  Film,
  KeyRound,
  Layers,
  Link2,
  Play,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { ApiPlayground } from "@/components/familyflix/api-playground";
import { CodeBlock } from "@/components/familyflix/code-block";
import { titles } from "@/lib/catalog";
import { site } from "@/lib/site";
import { TMDB_ATTRIBUTION } from "@/lib/video/tmdb";

export const metadata: Metadata = {
  title: "Developer API & Embeds",
  description:
    "Embed FamilyFlix movies and trailers on your site, browse the public catalog API, and license developer access with a one-time fee.",
  alternates: { canonical: "/developers" },
};

const movieCount = titles.filter((title) => title.type === "movie").length;

const fee = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: site.developer.currency,
}).format(site.developer.licenseFee);

const base = site.url.replace(/\/$/, "");

const requestHref = `mailto:${site.contact.developers}?subject=${encodeURIComponent(
  site.developer.requestSubject,
)}&body=${encodeURIComponent(
  "Hi FamilyFlix team,\n\nI would like to license the FamilyFlix developer API.\n\nCompany:\nWebsite or app:\nWhat I am building:\n\nThanks,",
)}`;

const movieEmbed = `<iframe
  src="${base}/embed/his-girl-friday"
  title="His Girl Friday on FamilyFlix"
  style="border:0;width:100%;aspect-ratio:16/9"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  loading="lazy"
></iframe>`;

const trailerEmbed = `<iframe
  src="${base}/embed/his-girl-friday/trailer"
  title="His Girl Friday trailer"
  style="border:0;width:100%;aspect-ratio:16/9"
  allow="autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
  loading="lazy"
></iframe>`;

const listRequest = `curl -s "${base}/api/v1/titles?type=movie&limit=3&sort=score" \\
  -H "X-API-Key: $FAMILYFLIX_API_KEY"`;

const detailRequest = `curl -s "${base}/api/v1/titles/his-girl-friday" \\
  -H "X-API-Key: $FAMILYFLIX_API_KEY"`;

const responseExample = `{
  "data": [
    {
      "slug": "his-girl-friday",
      "name": "His Girl Friday",
      "year": 1940,
      "type": "movie",
      "rating": "NR",
      "score": 96,
      "genres": ["Comedy", "Romance"],
      "images": {
        "poster": "https://images.unsplash.com/...",
        "backdrop": "https://images.unsplash.com/..."
      },
      "links": {
        "page": "${base}/title/his-girl-friday",
        "embed": "${base}/embed/his-girl-friday",
        "trailerEmbed": "${base}/embed/his-girl-friday/trailer",
        "playback": "${base}/api/playback/his-girl-friday"
      },
      "license": {
        "type": "public_domain",
        "rightsHolder": "Public domain",
        "sourceUrl": "https://archive.org/details/his_girl_friday"
      }
    }
  ],
  "pagination": { "total": 1, "limit": 3, "offset": 0, "hasMore": false }
}`;

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/titles",
    description:
      "Search and browse the catalog. Filter by type and genre, paginate with limit and offset.",
  },
  {
    method: "GET",
    path: "/api/v1/titles/{slug}",
    description:
      "One title with cast, artwork, license details, related titles and every embed link.",
  },
  {
    method: "GET",
    path: "/api/playback/{slug}",
    description:
      "Short-lived playback source for the title: MP4 or HLS plus subtitle tracks.",
  },
  {
    method: "GET",
    path: "/embed/{slug}",
    description:
      "Full ad-supported player, ready to drop into an iframe. Movies only.",
  },
  {
    method: "GET",
    path: "/embed/{slug}/trailer",
    description:
      "Official trailer in a responsive iframe. Returns a branded fallback when no trailer exists.",
  },
];

const params = [
  ["type", "movie | series | live", "Filter by title kind."],
  ["genre", "Comedy, Horror, Western…", "Exact, case-insensitive genre match."],
  ["q", "his girl friday", "Full-text search over titles, people and genres."],
  ["sort", "score | newest | oldest | name", "Default: score."],
  ["limit", "1–100", "Page size. Default: 24."],
  ["offset", "0–10000", "Rows to skip. Default: 0."],
];

const errors = [
  ["400", "invalid_type / invalid_sort", "A filter value is not supported."],
  ["401", "invalid_api_key", "The supplied key is not active."],
  ["404", "not_found", "No title matches that slug."],
  ["429", "rate_limited", "Wait for the Retry-After header, then retry."],
];

const licensePerks = [
  `Production API key for ${movieCount}+ movies and the full catalog`,
  "Movie player embeds and trailer embeds on sites and apps you operate",
  "120 requests per minute instead of the public 30",
  "Commercial use, documented attribution and integration support",
  "One payment, no subscription, no revenue share, no expiry",
];

const supportPoints = [
  "Keep the FamilyFlix player, branding and ads intact.",
  "Show the TMDB attribution when you display TMDB artwork.",
  "Never download, re-host or proxy the video files.",
  "Respect each title's license metadata and source link.",
];

export default function DevelopersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: site.developer.licenseName,
    description:
      "One-time license for the FamilyFlix catalog API, movie embeds and trailer embeds.",
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      price: site.developer.licenseFee.toFixed(2),
      priceCurrency: site.developer.currency,
      availability: "https://schema.org/InStock",
      url: `${base}/developers`,
    },
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b79dff]">
        Developers
      </p>
      <h1 className="mt-3 max-w-[20ch] text-balance text-[clamp(2.3rem,6vw,4.4rem)] font-black uppercase leading-[0.9] tracking-[-0.045em] text-white">
        Put FamilyFlix on your screen.
      </h1>
      <p className="mt-5 max-w-[68ch] text-[15px] leading-relaxed text-white/60">
        Embed our ad-supported player, add official trailers, and build with the
        same catalog that powers the site. Metadata is free to explore. Commercial
        embedding is covered by a one-time developer license.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <a
          href={requestHref}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08060f]"
        >
          Get API access
          <ArrowRight className="size-4" aria-hidden />
        </a>
        <Link
          href="#api"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Code2 className="size-4" aria-hidden />
          Read the API reference
        </Link>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Movies", value: `${movieCount}+` },
          { label: "Embeds", value: "Player + trailer" },
          { label: "Format", value: "REST / JSON" },
          { label: "License", value: fee },
        ].map((fact) => (
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

      <section className="mt-14">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          Two ways to ship
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Play,
              title: "Movie player",
              body: "Drop a single iframe into any page. The ad-supported player handles playback, subtitles and resume position.",
            },
            {
              icon: Film,
              title: "Trailer embed",
              body: "Show an official trailer before sending viewers to the full movie. Perfect for reviews and listings.",
            },
            {
              icon: Layers,
              title: "Catalog API",
              body: "Search, filter and paginate titles with posters, backdrops, cast, genres and license metadata.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <item.icon className="size-5 text-[#b79dff]" aria-hidden />
              <h3 className="mt-3 text-[14px] font-bold text-white">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="quickstart" className="mt-14 scroll-mt-24">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          Quick start
        </h2>
        <div className="mt-4 grid gap-4">
          <CodeBlock label="Movie player embed" code={movieEmbed} />
          <CodeBlock label="Trailer embed" code={trailerEmbed} />
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock label="List titles" code={listRequest} />
            <CodeBlock label="Single title" code={detailRequest} />
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-white/35">
          Embeds are responsive and inherit their container width. Give the
          iframe a 16:9 size for the best result. The player requires the host
          page to allow fullscreen.
        </p>
      </section>

      <section id="api" className="mt-14 scroll-mt-24">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          API reference
        </h2>
        <p className="mt-3 max-w-[68ch] text-[13.5px] leading-relaxed text-white/50">
          Catalog endpoints are under{" "}
          <code className="text-white/80">{base}/api/v1</code>. Embed and
          playback paths in the table are absolute. Send your key as{" "}
          <code className="text-white/80">X-API-Key</code> or as a bearer token.
          Requests without a key work for evaluation at the public rate limit.
          CORS is open, so browser clients can call the catalog directly.
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="bg-white/[0.04] text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3">Path</th>
                <th scope="col" className="px-4 py-3">What it returns</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.path} className="border-t border-white/[0.06]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] font-semibold text-emerald-300/80">
                    {endpoint.method}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] text-white/80">
                    {endpoint.path}
                  </td>
                  <td className="px-4 py-3 leading-relaxed text-white/45">
                    {endpoint.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 text-[13.5px] font-bold text-white">
          List query parameters
        </h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="bg-white/[0.04] text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                <th scope="col" className="px-4 py-3">Parameter</th>
                <th scope="col" className="px-4 py-3">Accepted values</th>
                <th scope="col" className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {params.map(([name, values, note]) => (
                <tr key={name} className="border-t border-white/[0.06]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] text-white/80">
                    {name}
                  </td>
                  <td className="px-4 py-3 text-white/60">{values}</td>
                  <td className="px-4 py-3 leading-relaxed text-white/45">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CodeBlock label="200 response" code={responseExample} />
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h3 className="text-[13.5px] font-bold text-white">Errors</h3>
            <ul className="mt-3 space-y-2.5">
              {errors.map(([status, code, note]) => (
                <li key={code} className="flex gap-3 text-[12px] leading-relaxed">
                  <span className="w-8 shrink-0 font-mono font-semibold text-white/70">
                    {status}
                  </span>
                  <span className="text-white/45">
                    <span className="font-mono text-white/70">{code}</span> — {note}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-white/[0.07] pt-4 text-[11.5px] leading-relaxed text-white/35">
              Rate limits: {site.developer.publicRateLimit} requests per minute
              per IP without a key, {site.developer.licensedRateLimit} with a
              licensed key. Every response includes{" "}
              <code className="text-white/55">X-RateLimit-Remaining</code>.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ApiPlayground />
        </div>
      </section>

      <section id="pricing" className="mt-14 scroll-mt-24">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          Developer license
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-b from-brand/[0.14] to-transparent p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[16px] font-bold text-white">
                {site.developer.licenseName}
              </h3>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                One time
              </span>
            </div>
            <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-white/50">
              One payment covers the catalog API, player embeds and trailer
              embeds for the sites and apps you operate.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-2">
              <span className="text-[clamp(2.2rem,5vw,3.4rem)] font-black leading-none tracking-[-0.045em] text-white">
                {fee}
              </span>
              <span className="pb-1.5 text-[12.5px] font-medium text-white/40">
                / one time {site.developer.currency}
              </span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {licensePerks.map((perk) => (
                <li
                  key={perk}
                  className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/60"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden />
                  {perk}
                </li>
              ))}
            </ul>
            <a
              href={requestHref}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08060f]"
            >
              <Wallet className="size-4" aria-hidden />
              Request access
            </a>
            <p className="mt-3 text-[11px] leading-relaxed text-white/30">
              Access is issued after payment so we can confirm the integration.
              We reply within 2 business days.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h3 className="text-[15px] font-bold text-white">How access works</h3>
            <ol className="mt-4 space-y-4">
              {[
                {
                  title: "Tell us what you are building",
                  body: "Email the developer team with your company, website and the integration you have in mind.",
                },
                {
                  title: "Pay the one-time invoice",
                  body: `We send a ${fee} ${site.developer.currency} invoice. No subscription is created.`,
                },
                {
                  title: "Receive your key and license",
                  body: "We issue a production API key and a written license covering your properties.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/15 text-[11px] font-bold text-white/70">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-white">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/45">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-[11.5px] leading-relaxed text-white/40">
                Building first? Public endpoints and embeds work without a key so
                you can prototype. A license is required before commercial launch.
              </p>
              <a
                href={`mailto:${site.contact.developers}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#b79dff] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {site.contact.developers}
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="rules" className="mt-14 scroll-mt-24">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          Rules of the road
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <ShieldCheck className="size-5 text-emerald-400" aria-hidden />
            <h3 className="mt-3 text-[14px] font-bold text-white">Always</h3>
            <ul className="mt-3 space-y-2">
              {supportPoints.map((point) => (
                <li
                  key={point}
                  className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/55"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <KeyRound className="size-5 text-[#b79dff]" aria-hidden />
            <h3 className="mt-3 text-[14px] font-bold text-white">
              Catalog metadata
            </h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">
              Every title carries a{" "}
              <code className="text-white/75">license</code> object with its type,
              rights holder and source. Public-domain films include the archive
              link used for playback. Licensed titles may only be shown while our
              rights are active.
            </p>
            <p className="mt-3 text-[11.5px] leading-relaxed text-white/35">
              {TMDB_ATTRIBUTION} Display this notice wherever TMDB artwork or
              metadata appears.
            </p>
            <p className="mt-3 text-[11.5px] leading-relaxed text-white/35">
              Keys are personal to the licensed company. Do not share a key or use
              it after your license ends.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[58ch]">
            <h2 className="text-[18px] font-bold text-white">
              Talk to the developer team
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">
              Questions about the API, embeds or the license? Email us with a
              short description of your integration and we will reply with next
              steps.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
              <a
                href={`mailto:${site.contact.developers}`}
                className="inline-flex items-center gap-1.5 font-semibold text-[#b79dff] transition-colors hover:text-white"
              >
                <Link2 className="size-3.5" aria-hidden />
                {site.contact.developers}
              </a>
              <Link
                href="/contact"
                className="text-white/50 transition-colors hover:text-white"
              >
                Other contact options
              </Link>
            </div>
          </div>
          <a
            href={requestHref}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Request access
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
