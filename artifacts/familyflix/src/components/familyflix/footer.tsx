import Link from "next/link";

import { FamilyFlixLogo } from "@/components/familyflix/logo";
import { copyrightLine, site } from "@/lib/site";
import { TMDB_ATTRIBUTION } from "@/lib/video/tmdb";

const genreLinks = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"];

const companyLinks = [
  { label: "About FamilyFlix", href: "/about" },
  { label: "Contact us", href: "/contact" },
  { label: "Developer API", href: "/developers" },
  { label: "Advertise with us", href: "/contact#advertising" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Ad choices", href: "/privacy#ad-choices" },
  { label: "Cookies", href: "/privacy#cookies" },
  {
    label: "Do Not Sell or Share My Personal Information",
    href: "/privacy#your-choices",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.07] bg-[#06040b]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 md:px-8 xl:px-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_1.4fr]">
          <div>
            <FamilyFlixLogo />
            <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed text-white/45">
              Classic public-domain films and licensed titles the whole family
              can enjoy. Always free, always ad-supported.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/50">
              Streaming in HD
            </p>
            <Link
              href="/movies"
              className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06040b]"
            >
              Start watching free
            </Link>
          </div>

          <nav aria-label="Browse">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Browse
            </h2>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/60">
              {[
                { label: "Home", href: "/" },
                { label: "Movies", href: "/movies" },
                { label: "TV Shows", href: "/tv-shows" },
                { label: "My List", href: "/my-list" },
                { label: "Search", href: "/search" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Genres">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Genres
            </h2>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/60">
              {genreLinks.map((genre) => (
                <li key={genre}>
                  <Link
                    href={`/movies?genre=${encodeURIComponent(genre)}`}
                    className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {genre}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Company
            </h2>
            <address className="mt-4 space-y-0.5 text-[12.5px] not-italic leading-relaxed text-white/50">
              <p className="font-semibold text-white/70">{site.legalName}</p>
              <p>
                {site.address.line1}, {site.address.line2}
              </p>
              <p>
                {site.address.city}, {site.address.region} {site.address.postalCode}
              </p>
              <p>{site.address.country}</p>
              <p className="pt-2">
                <a
                  href={`mailto:${site.contact.support}`}
                  className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {site.contact.support}
                </a>
              </p>
              <p>
                <a
                  href={`tel:${site.contact.phoneHref}`}
                  className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {site.contact.phone}
                </a>
              </p>
              <p className="pt-2 text-[11.5px] text-white/35">
                Support open {site.supportHours}
              </p>
            </address>
            <ul className="mt-4 space-y-2 text-[12.5px] text-white/55">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.07] pt-6">
          <div className="flex flex-col gap-4 text-[11px] text-white/35 lg:flex-row lg:items-center lg:justify-between">
            <p>{copyrightLine} FamilyFlix is a free, ad-supported streaming service.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {legalLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {item.label}
                </Link>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-white/30" />
                {site.language}
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-white/30">
            {TMDB_ATTRIBUTION}{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              themoviedb.org
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
