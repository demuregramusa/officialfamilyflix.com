import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdPlayer } from "@/components/familyflix/ad-block";
import { getSettings } from "@/lib/admin/settings";
import { getTitle } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Player",
  robots: { index: false, follow: false },
};

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const settings = await getSettings();
  if (!settings.developer.embedsEnabled) notFound();

  const { slug } = await params;
  const title = getTitle(slug);
  if (!title) notFound();

  return (
    <div className="h-dvh w-full overflow-hidden bg-black">
      <AdPlayer
        title={title}
        adsEnabled={settings.playback.adsEnabled}
        durationSeconds={settings.playback.adDurationSeconds}
        skipAfterSeconds={settings.playback.adSkipAfterSeconds}
      />
    </div>
  );
}
