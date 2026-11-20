import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage, type InfoSection } from "@/components/familyflix/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of FamilyFlix, including eligibility, acceptable use, advertising, copyright, disclaimers and dispute resolution.",
  alternates: { canonical: "/terms" },
};

const developerFee = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: site.developer.currency,
}).format(site.developer.licenseFee);

const sections: InfoSection[] = [
  {
    id: "acceptance",
    heading: "1. Acceptance of these Terms",
    paragraphs: [
      `These Terms of Service ("Terms") are a legal agreement between you and ${site.legalName} ("FamilyFlix", "we", "us"). By accessing or using www.familyflix.com, our apps, players, embeds or any related services (the "Service"), you agree to these Terms and to our Privacy Policy.`,
      "If you do not agree, do not use the Service.",
    ],
  },
  {
    id: "eligibility",
    heading: "2. Eligibility and parental controls",
    paragraphs: [
      "You must be at least 13 years old to use the Service. If you are between 13 and 18, you may use the Service only with the involvement and consent of a parent or legal guardian. If you are under 13, you may use the Service only through a profile created and supervised by a parent or guardian.",
      "Parents and guardians are responsible for supervising minors' use of the Service, for any content viewed, and for configuring device-level parental controls where needed. Kids profiles may limit content and advertising personalisation.",
    ],
  },
  {
    id: "service",
    heading: "3. The Service",
    paragraphs: [
      "FamilyFlix is a free, advertising-supported streaming service. No subscription or payment is required. The Service includes movies, TV shows, recommendations, My List and related features.",
      "Content availability varies by title, region and time, and titles may be added or removed at any time. We may modify, suspend or discontinue any part of the Service, including features and content, without notice. We do not guarantee that any particular title will remain available.",
      "The Service may contain advertising, including pre-roll, mid-roll and display advertising. Ads are part of the Service and cannot be removed except through features we may offer.",
    ],
  },
  {
    id: "profiles",
    heading: "4. Profiles, My List and guest use",
    paragraphs: [
      "You can use much of the Service as a guest. Guest features such as My List are stored locally in your browser and are not synced across devices. Clearing site data removes locally stored items.",
      "You are responsible for activity that occurs through your profiles and for keeping access to your devices secure. Do not share profile access in a way that violates these Terms.",
    ],
  },
  {
    id: "licence",
    heading: "5. Licence to use the Service",
    paragraphs: [
      "Subject to these Terms, we grant you a limited, revocable, non-exclusive, non-transferable licence to access and use the Service for personal, non-commercial viewing within your household.",
      "You may not reproduce, distribute, publicly perform, publicly display, sell, rent, sublicense, modify, scrape, mirror or create derivative works from the Service or its content, except as expressly permitted by law or by us in writing.",
    ],
  },
  {
    id: "content",
    heading: "6. Content and intellectual property",
    paragraphs: [
      `The Service, including its interface, design, logos, text, graphics, video, audio and software, is owned by ${site.legalName}, its licensors or content partners and is protected by copyright, trademark and other laws. FamilyFlix, the FamilyFlix logo and related marks are trademarks of ${site.legalName}. All rights not expressly granted are reserved.`,
      "Third-party titles, channels, trailers and artwork remain the property of their respective owners and are made available under licence.",
    ],
  },
  {
    id: "acceptable-use",
    heading: "7. Acceptable use",
    bullets: [
      "Do not bypass, disable or interfere with ads, paywalls, region controls, digital rights management or security features.",
      "Do not use bots, scrapers, automated downloads or other tools to access or copy the Service or its content.",
      "Do not reverse engineer, decompile or attempt to extract source code, except where the law expressly permits it.",
      "Do not upload or transmit malware, spam or unlawful, harmful, threatening, abusive or infringing material.",
      "Do not impersonate any person, misrepresent your affiliation, or use the Service for commercial exhibition without a written agreement.",
      "Do not use the Service in a way that could damage, overload or impair it or interfere with other users.",
    ],
    paragraphs: [
      "We may suspend or terminate access if we reasonably believe you have violated these Terms or applicable law.",
    ],
  },
  {
    id: "advertising",
    heading: "8. Advertising",
    paragraphs: [
      "The Service is funded by advertising. You agree that ads may be shown before, during and around content, and that ad delivery may be based on the content you watch, your approximate location or your settings.",
      "Advertising is subject to our Privacy Policy and applicable law. We are not responsible for the products or services offered by advertisers or for third-party landing pages.",
    ],
  },
  {
    id: "third-party",
    heading: "9. Third-party services and links",
    paragraphs: [
      "The Service may include links to third-party websites, apps or services. Those services are not controlled by us and are subject to their own terms and privacy policies. We are not responsible for third-party content, products or practices.",
    ],
  },
  {
    id: "copyright",
    heading: "10. Copyright and DMCA notices",
    paragraphs: [
      `If you believe content on the Service infringes your copyright, send a written notice to our designated agent at ${site.contact.legal}, with the subject line "Copyright Notice", or by mail to ${site.legalName}, ${site.address.line1}, ${site.address.line2}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}, ${site.address.country}.`,
      "Your notice must include: a physical or electronic signature; identification of the copyrighted work; identification of the allegedly infringing material and enough information for us to locate it; your contact information; a statement that you have a good-faith belief the use is not authorised; and a statement, under penalty of perjury, that the information is accurate and that you are the owner or authorised to act on the owner's behalf.",
      "We may remove or disable access to material and may terminate accounts of repeat infringers. If you believe material was removed by mistake, you may send a counter-notice that complies with the DMCA.",
    ],
  },
  {
    id: "disclaimers",
    heading: "11. Disclaimers",
    paragraphs: [
      'The Service is provided "as is" and "as available" without warranties of any kind, whether express, implied or statutory, including warranties of merchantability, fitness for a particular purpose, title, non-infringement and uninterrupted or error-free operation.',
      "We do not warrant that the Service will be available at all times, that content will be accurate or complete, or that defects will be corrected. Some jurisdictions do not allow the exclusion of certain warranties, so parts of this section may not apply to you.",
    ],
  },
  {
    id: "liability",
    heading: "12. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, FamilyFlix and its officers, directors, employees, agents, partners and licensors will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for lost profits, revenues, data, goodwill or opportunities, arising out of or related to the Service or these Terms.",
      "To the maximum extent permitted by law, our total liability for all claims relating to the Service or these Terms will not exceed one hundred US dollars (US$100). Some jurisdictions do not allow these limitations, so some of them may not apply to you. Nothing in these Terms limits liability that cannot be limited by law.",
    ],
  },
  {
    id: "indemnity",
    heading: "13. Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless FamilyFlix and its officers, directors, employees, agents, partners and licensors from any claims, damages, liabilities, costs and expenses (including reasonable legal fees) arising from your misuse of the Service, your violation of these Terms or your violation of any law or third-party right.",
    ],
  },
  {
    id: "disputes",
    heading: "14. Governing law and disputes",
    paragraphs: [
      "These Terms are governed by the laws of the State of California, without regard to conflict-of-law rules. Subject to applicable law, you and FamilyFlix agree to first try to resolve any dispute informally by contacting us at the email address below. If the dispute is not resolved within 30 days, either party may bring a claim in the state or federal courts located in Los Angeles County, California, and both parties consent to their jurisdiction.",
      "Nothing in this section prevents either party from seeking injunctive or other equitable relief, or from bringing a claim in small-claims court where eligible. Rights that cannot be waived under applicable consumer law remain unaffected.",
    ],
  },
  {
    id: "changes",
    heading: "15. Changes to these Terms",
    paragraphs: [
      "We may update these Terms from time to time. When we do, we will post the revised Terms on this page and update the effective date. Material changes will be notified as required by law. Your continued use of the Service after changes take effect means you accept the revised Terms.",
    ],
  },
  {
    id: "contact",
    heading: "16. Contact",
    paragraphs: [
      `Questions about these Terms can be sent to ${site.contact.legal} or by mail to ${site.legalName}, ${site.address.line1}, ${site.address.line2}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}, ${site.address.country}. You can also call ${site.contact.phone}.`,
    ],
  },
  {
    id: "developer-api",
    heading: "17. Developer API and embeds",
    paragraphs: [
      `Our catalog API, player embeds and trailer embeds are available for evaluation. Commercial use requires a one-time ${developerFee} ${site.developer.currency} developer license purchased from ${site.legalName}. The license covers the properties you operate and does not expire unless terminated for breach.`,
      "A developer license does not transfer ownership of any content. You may not download, re-host, proxy, scrape or redistribute video files, or remove FamilyFlix branding, advertising or required attribution. API keys are confidential and may be revoked for abuse, non-payment or violation of these Terms.",
      `Each title returns license metadata, including its type, rights holder and source. You must respect that metadata, keep the TMDB notice wherever TMDB artwork or metadata appears, and stop displaying a title if its rights expire. Access requests go to ${site.contact.developers}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={`These Terms govern your use of FamilyFlix, a free ad-supported streaming service operated by ${site.legalName}. Please read them carefully.`}
      updated="Effective January 1, 2026 · Last updated November 18, 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-[15px] font-bold text-white">See also</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
          Our{" "}
          <Link
            href="/privacy"
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            Privacy Policy
          </Link>{" "}
          explains how information is collected and used. For help with the
          Service, visit{" "}
          <Link
            href="/contact"
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            Contact us
          </Link>
          . Developers should read the{" "}
          <Link
            href="/developers"
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            API and embedding terms
          </Link>
          .
        </p>
      </div>
    </InfoPage>
  );
}
