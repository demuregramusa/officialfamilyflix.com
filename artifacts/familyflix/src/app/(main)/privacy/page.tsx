import type { Metadata } from "next";

import { InfoPage, type InfoSection } from "@/components/familyflix/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FamilyFlix Media, Inc. collects, uses and shares information, the cookies we use, your advertising choices and your privacy rights.",
  alternates: { canonical: "/privacy" },
};

const sections: InfoSection[] = [
  {
    id: "overview",
    heading: "1. Overview",
    paragraphs: [
      `This Privacy Policy explains how ${site.legalName} ("FamilyFlix", "we", "us") collects, uses and shares information when you visit familyflix.demuregram.com, use our apps, or watch movies and TV shows through the service (together, the "Service").`,
      "FamilyFlix is free and supported by advertising. We do not require a subscription or payment details to watch. We collect only the information we need to run the Service, personalise your experience, measure performance and show relevant ads.",
    ],
  },
  {
    id: "information-we-collect",
    heading: "2. Information we collect",
    paragraphs: [
      "We collect information in three ways: information you give us, information collected automatically, and information from partners.",
    ],
    bullets: [
      "Information you provide: your email address when you contact support, a display name if you create a profile, and any messages or attachments you send us.",
      "Viewing information: titles you watch, watch progress, search terms, titles saved to My List, and the rows and recommendations you interact with.",
      "Device and usage information: IP address, browser type, operating system, device identifiers, approximate location derived from IP, pages viewed, referring URLs, playback quality and error logs.",
      "Advertising information: ad impressions, clicks, skip events and the advertising identifiers shared by your device, where permitted by law.",
      "Communications: support tickets, survey responses and feedback you submit.",
    ],
  },
  {
    id: "how-we-use",
    heading: "3. How we use information",
    bullets: [
      "To operate the Service, deliver video streams, remember your My List and continue watching from where you left off.",
      "To recommend movies and shows that match your household's interests.",
      "To measure audience size, playback performance and content popularity.",
      "To deliver and measure advertising, including limiting how often you see the same ad and measuring whether ads are effective.",
      "To provide customer support and respond to your requests.",
      "To protect the Service, detect fraud and abuse, and enforce our Terms of Service.",
      "To comply with legal obligations and respond to lawful requests.",
    ],
  },
  {
    id: "legal-bases",
    heading: "4. Legal bases for processing",
    paragraphs: [
      "Where laws such as the GDPR or UK GDPR apply, we rely on the following legal bases: performance of a contract (providing the Service), legitimate interests (improving the Service, measurement and advertising), consent (where required, for example for certain cookies or marketing communications), and legal obligation.",
      "You can withdraw consent at any time without affecting the lawfulness of processing that happened before withdrawal.",
    ],
  },
  {
    id: "cookies",
    heading: "5. Cookies and similar technologies",
    paragraphs: [
      "We use cookies, local storage and similar technologies to keep the Service working, remember preferences such as My List, understand how the Service is used and support advertising.",
      "Essential technologies are required to run the Service. Analytics and advertising technologies are used where permitted and can be controlled through your browser or device settings. Blocking some technologies may affect playback, recommendations or saved lists.",
      "We use browser local storage to store your My List on your device. Clearing site data deletes the list stored in that browser.",
    ],
  },
  {
    id: "ad-choices",
    heading: "6. Advertising and ad choices",
    paragraphs: [
      "FamilyFlix is ad-supported. We and our advertising partners may use information from your use of the Service to show you ads that are more relevant to you, and to measure ad performance.",
      "You can limit personalised advertising in the following ways: adjust your browser or device privacy settings, including global privacy controls such as Global Privacy Control (GPC) where supported; clear cookies and site data; or contact us to exercise available opt-out rights.",
      "We do not use information about children to deliver personalised advertising. Where a profile is marked as a child profile, we limit data collection and serve contextual ads only.",
    ],
  },
  {
    id: "sharing",
    heading: "7. How we share information",
    bullets: [
      "Service providers that host video, provide analytics, deliver advertising, prevent fraud, or operate customer support, under contracts that limit their use of the information.",
      "Advertising partners, for ad delivery and measurement, subject to your settings and applicable law.",
      "Content partners, in aggregated or de-identified form, so they can understand how their titles perform.",
      "Professional advisers, regulators, courts and law enforcement where required by law or necessary to protect rights and safety.",
      "A successor entity in connection with a merger, acquisition, financing or sale of assets, subject to this Policy.",
    ],
    paragraphs: [
      "We do not sell your personal information for money. Certain sharing for cross-context behavioural advertising may be considered a \"sale\" or \"sharing\" under some US state privacy laws; see Your privacy rights and choices below.",
    ],
  },
  {
    id: "retention",
    heading: "8. How long we keep information",
    paragraphs: [
      "We keep information only as long as needed for the purposes described in this Policy. Viewing history is retained while it is needed to provide recommendations and continue watching, and is deleted or de-identified after a period of inactivity. Support records are retained for up to 24 months. Advertising and measurement records are typically retained for up to 24 months. We may retain information longer where required by law or to resolve disputes.",
    ],
  },
  {
    id: "security",
    heading: "9. Security",
    paragraphs: [
      "We use administrative, technical and physical safeguards designed to protect information, including encryption in transit, access controls and vendor reviews. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. If we become aware of a breach affecting personal information, we will notify affected users and authorities as required by law.",
    ],
  },
  {
    id: "children",
    heading: "10. Children's privacy",
    paragraphs: [
      "FamilyFlix is designed for families, but the Service is not directed to children under 13. We do not knowingly collect personal information from children under 13 except as permitted by law with parental consent. Parents and guardians can use device-level parental controls and our kids profiles to limit access.",
      `If you believe a child under 13 has provided personal information to us, contact ${site.contact.privacy} and we will review and delete the information as appropriate.`,
    ],
  },
  {
    id: "your-choices",
    heading: "11. Your privacy rights and choices",
    paragraphs: [
      "Depending on where you live, you may have the right to: confirm whether we process your personal information; access a copy; correct inaccurate information; delete information; port information you provided; opt out of targeted advertising, sale or sharing; limit the use of sensitive information; and appeal a decision.",
      "California residents also have the right to know the categories of information collected and disclosed, and the right not to receive discriminatory treatment for exercising privacy rights.",
      "To exercise a right, email our privacy team. You can use an authorised agent where the law allows. We may need to verify your request, which usually requires your email address and a description of the request. We aim to respond within 45 days and will tell you if we need more time.",
    ],
  },
  {
    id: "international",
    heading: "12. International users",
    paragraphs: [
      "FamilyFlix is operated from the United States. If you access the Service from another country, your information may be transferred to, stored in and processed in the United States and other countries where our providers operate. Where required, we use appropriate safeguards for these transfers, such as standard contractual clauses.",
    ],
  },
  {
    id: "third-parties",
    heading: "13. Third-party links and services",
    paragraphs: [
      "The Service may link to third-party sites or services. Those services have their own privacy policies, and we are not responsible for their practices. We encourage you to review their policies before providing information.",
    ],
  },
  {
    id: "changes",
    heading: "14. Changes to this Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. When we make material changes, we will post the updated policy on this page and update the effective date. Where required, we will provide additional notice or ask for consent.",
    ],
  },
  {
    id: "contact",
    heading: "15. Contact us",
    paragraphs: [
      `Questions about this Privacy Policy or our data practices can be sent to ${site.contact.privacy} or ${site.contact.legal}. You can also write to us at ${site.legalName}, ${site.address.line1}, ${site.address.line2}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}, ${site.address.country}, or call ${site.contact.phone}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={`This Privacy Policy describes how ${site.legalName} handles information when you use FamilyFlix. We keep it in plain language and explain the choices available to you.`}
      updated="Effective January 1, 2026 · Last updated November 18, 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-[15px] font-bold text-white">Quick contact</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
          Privacy requests:{" "}
          <a
            href={`mailto:${site.contact.privacy}`}
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            {site.contact.privacy}
          </a>
          <br />
          Legal notices:{" "}
          <a
            href={`mailto:${site.contact.legal}`}
            className="text-[#b79dff] transition-colors hover:text-white"
          >
            {site.contact.legal}
          </a>
        </p>
      </div>
    </InfoPage>
  );
}
