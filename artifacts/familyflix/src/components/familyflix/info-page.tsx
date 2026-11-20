import type { ReactNode } from "react";

export interface InfoSection {
  id?: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export function InfoPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  sections: InfoSection[];
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pt-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b79dff]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-white">
        {title}
      </h1>
      <p className="mt-4 max-w-[68ch] text-[14.5px] leading-relaxed text-white/60">
        {intro}
      </p>
      {updated ? (
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/30">
          {updated}
        </p>
      ) : null}

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading} id={section.id} className="scroll-mt-24">
            <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">
              {section.heading}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-2.5 text-[13.5px] leading-relaxed text-white/55"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-white/55 marker:text-white/25">
                {section.bullets.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {children}
    </div>
  );
}
