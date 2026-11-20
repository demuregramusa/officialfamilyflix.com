import type { Metadata } from "next";
import Link from "next/link";
import { Code2, LifeBuoy, Megaphone, Newspaper, Scale } from "lucide-react";

import { companyAddress, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact FamilyFlix for viewer support, press enquiries, advertising and legal matters. Find our email addresses, phone number and company address.",
  alternates: { canonical: "/contact" },
};

const teams = [
  {
    id: "support",
    icon: LifeBuoy,
    title: "Viewer support",
    email: site.contact.support,
    description:
      "Playback issues, accessibility help, privacy requests and everything else about watching FamilyFlix.",
    response: "Replies within 24 hours, 7 days a week",
  },
  {
    id: "advertising",
    icon: Megaphone,
    title: "Advertising & partnerships",
    email: site.contact.advertising,
    description:
      "Ad placements, sponsored collections, brand integrations and media partnerships.",
    response: "Replies within 2 business days",
  },
  {
    id: "press",
    icon: Newspaper,
    title: "Press & media",
    email: site.contact.press,
    description:
      "Interviews, brand assets, company background and press enquiries.",
    response: "Replies within 2 business days",
  },
  {
    id: "legal",
    icon: Scale,
    title: "Legal & copyright",
    email: site.contact.legal,
    description:
      "Terms questions, copyright notices, law enforcement requests and privacy rights.",
    response: "Replies within 5 business days",
  },
  {
    id: "developers",
    icon: Code2,
    title: "Developer API",
    email: site.contact.developers,
    description:
      "API keys, movie and trailer embeds, licensing and integration help for the FamilyFlix catalog.",
    response: "Replies within 2 business days",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pt-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b79dff]">
        Contact
      </p>
      <h1 className="mt-3 text-balance text-[clamp(2.2rem,5.5vw,3.8rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-white">
        We are here to help.
      </h1>
      <p className="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-white/60">
        Choose the team that fits your question and email us directly.{" "}
        {site.legalName} answers viewer support {site.supportHours}.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {teams.map((team) => (
          <section
            key={team.id}
            id={team.id}
            className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <team.icon className="size-5 text-[#b79dff]" aria-hidden />
            <h2 className="mt-3 text-[15px] font-bold text-white">{team.title}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
              {team.description}
            </p>
            <a
              href={`mailto:${team.email}`}
              className="mt-4 inline-flex items-center text-[13px] font-semibold text-[#b79dff] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {team.email}
            </a>
            <p className="mt-1 text-[11px] text-white/30">{team.response}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Call us
          </h2>
          <a
            href={`tel:${site.contact.phoneHref}`}
            className="mt-2 inline-block text-[20px] font-bold tracking-[-0.01em] text-white transition-colors hover:text-[#b79dff]"
          >
            {site.contact.phone}
          </a>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
            Toll-free within the United States and Canada. Support is available{" "}
            {site.supportHours}. International callers can email us at any time.
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Mailing address
          </h2>
          <address className="mt-2 text-[13px] not-italic leading-relaxed text-white/60">
            <p className="font-semibold text-white">{site.legalName}</p>
            <p>{site.address.line1}, {site.address.line2}</p>
            <p>
              {site.address.city}, {site.address.region} {site.address.postalCode}
            </p>
            <p>{site.address.country}</p>
          </address>
          <p className="mt-2 text-[12px] leading-relaxed text-white/35">
            {companyAddress}
          </p>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-[15px] font-bold text-white">Before you write</h2>
        <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-white/45">
          <li>
            Include the device and browser you were using, plus the title you
            were watching, so support can reproduce the issue faster.
          </li>
          <li>
            Privacy requests are handled by our privacy team. Email{" "}
            <a
              href={`mailto:${site.contact.privacy}`}
              className="text-[#b79dff] transition-colors hover:text-white"
            >
              {site.contact.privacy}
            </a>{" "}
            and we will confirm within 10 business days.
          </li>
          <li>
            Copyright notices should follow the process described in our{" "}
            <Link
              href="/terms#copyright"
              className="text-[#b79dff] transition-colors hover:text-white"
            >
              Terms of Service
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
