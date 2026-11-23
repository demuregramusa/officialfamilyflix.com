import { db, adCampaigns, adCreatives, adCuePoints, adEvents, adFrequencyLogs, movies, seriesEpisodes } from "@workspace/db";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { logger } from "./logger";
import { createHash } from "crypto";

export interface AdDecisionParams {
  placement: "preroll" | "midroll" | "pause" | "interactive";
  titleSlug?: string;
  episodeId?: string;
  sessionId: string;
  currentTime?: number;
  deviceType?: string;
  genre?: string;
}

export interface AdItem {
  id: string;
  campaignId: string;
  creativeId: string;
  advertiserName: string;
  title: string;
  creativeType: "video" | "image" | "vast_tag" | "interactive_qr";
  mediaUrl: string | null;
  vastTagUrl: string | null;
  durationSeconds: number;
  isSkippable: boolean;
  skipOffsetSeconds: number;
  clickThroughUrl: string | null;
  qrCodeUrl: string | null;
  callToActionText: string;
  sponsorBadgeText: string;
  companionBannerUrl: string | null;
  trackingUrls: {
    start: string;
    firstQuartile: string;
    midpoint: string;
    thirdQuartile: string;
    complete: string;
    click: string;
    skip: string;
  };
}

export interface AdPod {
  podId: string;
  placement: "preroll" | "midroll" | "pause" | "interactive";
  cuePointSeconds?: number;
  totalDurationSeconds: number;
  maxAds: number;
  ads: AdItem[];
}

export interface CuePointItem {
  timestampSeconds: number;
  formattedTime: string;
  cueType: string;
  label: string;
  podMaxAds: number;
  podMaxDurationSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function hashClientIp(ip?: string): string {
  if (!ip) return "anonymous";
  return createHash("sha256").update(ip + "familyflix-salt-2026").digest("hex").slice(0, 16);
}

// -------------------------------------------------------------
// 1. AD DECISION ENGINE
// -------------------------------------------------------------
export async function getAdDecision(params: AdDecisionParams): Promise<AdPod | null> {
  const {
    placement = "preroll",
    titleSlug,
    episodeId,
    sessionId,
    deviceType = "desktop",
    genre = "*",
  } = params;

  try {
    // 1. Fetch eligible active campaigns
    const now = new Date();
    const activeCampaigns = await db
      .select()
      .from(adCampaigns)
      .where(
        and(
          eq(adCampaigns.status, "active"),
          or(isNull(adCampaigns.startDate), lte(adCampaigns.startDate, now)),
          or(isNull(adCampaigns.endDate), gte(adCampaigns.endDate, now))
        )
      )
      .orderBy(desc(adCampaigns.priority), desc(adCampaigns.createdAt));

    if (activeCampaigns.length === 0) {
      // Return default network sponsor (Monetag Zone #7651065)
      return getDefaultAdPod(placement, sessionId, titleSlug, episodeId);
    }

    // 2. Filter by placement and targeting
    const eligibleCampaigns: typeof activeCampaigns = [];
    for (const campaign of activeCampaigns) {
      const placements = (campaign.placements as string[]) || [];
      if (!placements.includes(placement) && !placements.includes("*")) continue;

      // Budget check
      const spent = parseFloat(campaign.spent || "0");
      const budget = parseFloat(campaign.budget || "1000");
      if (budget > 0 && spent >= budget) continue;

      // Impression cap check
      if (campaign.maxImpressionsTotal && campaign.totalImpressionsServed >= campaign.maxImpressionsTotal) continue;

      // Frequency cap check per session
      const [sessionCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(adFrequencyLogs)
        .where(
          and(
            eq(adFrequencyLogs.sessionId, sessionId),
            eq(adFrequencyLogs.campaignId, campaign.id)
          )
        );
      const sessionImpressions = Number(sessionCountRow?.count || 0);
      if (sessionImpressions >= (campaign.maxImpressionsPerSession || 3)) continue;

      eligibleCampaigns.push(campaign);
    }

    if (eligibleCampaigns.length === 0) {
      return getDefaultAdPod(placement, sessionId, titleSlug, episodeId);
    }

    // 3. Select up to 2 ads per pod with advertiser separation
    const selectedAds: AdItem[] = [];
    const usedAdvertisers = new Set<string>();
    let podDuration = 0;
    const maxPodDuration = placement === "pause" ? 0 : 45;

    for (const campaign of eligibleCampaigns) {
      if (selectedAds.length >= 2) break;
      if (usedAdvertisers.has(campaign.advertiserName.toLowerCase())) continue;

      // Load creatives for this campaign
      const creatives = await db
        .select()
        .from(adCreatives)
        .where(and(eq(adCreatives.campaignId, campaign.id), eq(adCreatives.status, "active")))
        .limit(3);

      const creative = creatives[0];
      const duration = creative?.durationSeconds || (placement === "pause" ? 0 : 15);

      if (podDuration + duration > maxPodDuration && selectedAds.length > 0) continue;

      const creativeId = creative?.id || campaign.id;
      const adItem: AdItem = {
        id: creativeId,
        campaignId: campaign.id,
        creativeId,
        advertiserName: campaign.advertiserName,
        title: creative?.name || campaign.name,
        creativeType: (creative?.creativeType as any) || (campaign.vastTagUrl ? "vast_tag" : "video"),
        mediaUrl: creative?.mediaUrl || null,
        vastTagUrl: creative?.vastTagUrl || campaign.vastTagUrl || null,
        durationSeconds: duration,
        isSkippable: creative ? creative.isSkippable : true,
        skipOffsetSeconds: creative ? creative.skipOffsetSeconds : 5,
        clickThroughUrl: creative?.clickThroughUrl || null,
        qrCodeUrl: creative?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(creative?.clickThroughUrl || "https://familyflix.demuregram.com")}`,
        callToActionText: creative?.callToActionText || "Visit Sponsor",
        sponsorBadgeText: creative?.sponsorBadgeText || `${campaign.advertiserName} — Official Sponsor`,
        companionBannerUrl: creative?.companionBannerUrl || null,
        trackingUrls: generateTrackingUrls(campaign.id, creativeId, sessionId, placement),
      };

      selectedAds.push(adItem);
      usedAdvertisers.add(campaign.advertiserName.toLowerCase());
      podDuration += duration;

      // Record frequency log
      await db.insert(adFrequencyLogs).values({
        sessionId,
        campaignId: campaign.id,
        creativeId,
        placement,
        servedAt: new Date(),
      }).catch(() => {});
    }

    if (selectedAds.length === 0) {
      return getDefaultAdPod(placement, sessionId, titleSlug, episodeId);
    }

    return {
      podId: `pod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      placement,
      cuePointSeconds: params.currentTime,
      totalDurationSeconds: podDuration,
      maxAds: selectedAds.length,
      ads: selectedAds,
    };
  } catch (error) {
    logger.warn({ err: error }, "Error computing ad decision, returning fallback ad pod");
    return getDefaultAdPod(placement, sessionId, titleSlug, episodeId);
  }
}

// Default Fallback Ad Pod (uses Monetag / HilltopAds Zone #7651065)
function getDefaultAdPod(
  placement: "preroll" | "midroll" | "pause" | "interactive",
  sessionId: string,
  titleSlug?: string,
  episodeId?: string
): AdPod {
  const defaultVast = "https://crookedagreement.com/d.mwFNzOdIGPN/vhZyGAUT/UeCmO9YubZkU/lJkPPdTmcx2/NTTcEMwnNpjJURtjNCzjYF1_MmT/A/2hOAQv";
  const dummyCampaignId = "00000000-0000-0000-0000-000000000001";
  const dummyCreativeId = "00000000-0000-0000-0000-000000000002";

  return {
    podId: `pod-default-${Date.now()}`,
    placement,
    totalDurationSeconds: placement === "pause" ? 0 : 15,
    maxAds: 1,
    ads: [
      {
        id: dummyCreativeId,
        campaignId: dummyCampaignId,
        creativeId: dummyCreativeId,
        advertiserName: "HilltopAds / Monetag Zone #7651065",
        title: "FamilyFlix Free Streaming Sponsor",
        creativeType: "vast_tag",
        mediaUrl: null,
        vastTagUrl: defaultVast,
        durationSeconds: placement === "pause" ? 0 : 15,
        isSkippable: true,
        skipOffsetSeconds: 5,
        clickThroughUrl: "https://familyflix.demuregram.com",
        qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Ffamilyflix.demuregram.com",
        callToActionText: "Visit Sponsor",
        sponsorBadgeText: "FamilyFlix Free Streaming Sponsor",
        companionBannerUrl: null,
        trackingUrls: generateTrackingUrls(dummyCampaignId, dummyCreativeId, sessionId, placement),
      },
    ],
  };
}

function generateTrackingUrls(campaignId: string, creativeId: string, sessionId: string, placement: string) {
  const base = `/api/v1/ads/events?campaignId=${campaignId}&creativeId=${creativeId}&sessionId=${encodeURIComponent(sessionId)}&placement=${placement}`;
  return {
    start: `${base}&type=start`,
    firstQuartile: `${base}&type=first_quartile`,
    midpoint: `${base}&type=midpoint`,
    thirdQuartile: `${base}&type=third_quartile`,
    complete: `${base}&type=complete`,
    click: `${base}&type=click`,
    skip: `${base}&type=skip`,
  };
}

// -------------------------------------------------------------
// 2. COMMERCIAL CUE POINTS (MID-ROLL BREAKS)
// -------------------------------------------------------------
export async function getCuePointsForTitle(slug: string, episodeId?: string): Promise<CuePointItem[]> {
  try {
    // 1. Check database for specific movie or episode
    let movieId: string | undefined;
    let titleDuration = 5400; // default 90 mins

    const [movieRow] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.slug, slug))
      .limit(1);

    if (movieRow) {
      movieId = movieRow.id;
    }

    if (movieId) {
      const dbCuePoints = await db
        .select()
        .from(adCuePoints)
        .where(
          episodeId
            ? eq(adCuePoints.episodeId, episodeId)
            : eq(adCuePoints.movieId, movieId)
        )
        .orderBy(adCuePoints.timestampSeconds);

      if (dbCuePoints.length > 0) {
        return dbCuePoints.map((cp) => ({
          timestampSeconds: cp.timestampSeconds,
          formattedTime: formatTime(cp.timestampSeconds),
          cueType: cp.cueType,
          label: cp.label,
          podMaxAds: cp.podMaxAds,
          podMaxDurationSeconds: cp.podMaxDurationSeconds,
        }));
      }
    }

    // 2. Dynamic television-grade AVOD cue points (Tubi-style 10-15 minute cadence)
    // 4 to 6 commercial breaks per 90-minute movie
    const dynamicCueSeconds = episodeId
      ? [420, 840] // 7m, 14m for TV episodes
      : [840, 1800, 2760, 3720, 4680]; // 14m, 30m, 46m, 62m, 78m for feature films

    return dynamicCueSeconds.map((sec, idx) => ({
      timestampSeconds: sec,
      formattedTime: formatTime(sec),
      cueType: "default_avod",
      label: `Commercial Break ${idx + 1}`,
      podMaxAds: 2,
      podMaxDurationSeconds: 45,
    }));
  } catch (error) {
    logger.warn({ err: error }, "Failed to query cue points, returning defaults");
    return [
      { timestampSeconds: 840, formattedTime: "14:00", cueType: "default_avod", label: "Commercial Break 1", podMaxAds: 2, podMaxDurationSeconds: 45 },
      { timestampSeconds: 1800, formattedTime: "30:00", cueType: "default_avod", label: "Commercial Break 2", podMaxAds: 2, podMaxDurationSeconds: 45 },
      { timestampSeconds: 2760, formattedTime: "46:00", cueType: "default_avod", label: "Commercial Break 3", podMaxAds: 2, podMaxDurationSeconds: 45 },
    ];
  }
}

// -------------------------------------------------------------
// 3. AD EVENT TRACKING & REVENUE REPORTING
// -------------------------------------------------------------
export async function trackAdEvent(event: {
  campaignId?: string;
  creativeId?: string;
  movieId?: string;
  episodeId?: string;
  sessionId: string;
  eventType: string;
  placement?: string;
  durationWatched?: number;
  adDuration?: number;
  deviceType?: string;
  clientIp?: string;
  userAgent?: string;
}) {
  try {
    const { campaignId, creativeId, eventType, sessionId } = event;

    // Calculate estimated revenue on complete impression (e.g. $8.50 CPM = $0.0085 per view)
    let estRev = 0;
    if (eventType === "complete") {
      estRev = 0.0085;
      if (campaignId) {
        // Increment metrics
        await db
          .update(adCampaigns)
          .set({
            totalImpressionsServed: sql`${adCampaigns.totalImpressionsServed} + 1`,
            totalCompletions: sql`${adCampaigns.totalCompletions} + 1`,
            spent: sql`${adCampaigns.spent} + ${estRev}`,
            updatedAt: new Date(),
          })
          .where(eq(adCampaigns.id, campaignId))
          .catch(() => {});
      }
    } else if (eventType === "click") {
      if (campaignId) {
        await db
          .update(adCampaigns)
          .set({
            totalClicks: sql`${adCampaigns.totalClicks} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(adCampaigns.id, campaignId))
          .catch(() => {});
      }
    }

    await db.insert(adEvents).values({
      campaignId: campaignId && campaignId.length === 36 ? campaignId : null,
      creativeId: creativeId && creativeId.length === 36 ? creativeId : null,
      movieId: event.movieId || null,
      episodeId: event.episodeId || null,
      sessionId: sessionId || "anon",
      eventType,
      placement: event.placement || "preroll",
      durationWatched: event.durationWatched || 0,
      adDuration: event.adDuration || 15,
      estimatedRevenue: estRev.toFixed(4),
      confirmedRevenue: "0.0000",
      deviceType: event.deviceType || "desktop",
      clientIpHash: hashClientIp(event.clientIp),
      userAgent: event.userAgent?.slice(0, 255) || null,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (err) {
    logger.warn({ err }, "Failed to record ad event");
    return { success: false };
  }
}

// -------------------------------------------------------------
// 4. VAST 3.0 / 4.0 XML GENERATOR
// -------------------------------------------------------------
export function generateVastXml(ad: AdItem, baseUrl = "https://familyflix.demuregram.com"): string {
  const clickThrough = ad.clickThroughUrl ? `<ClickThrough><![CDATA[${ad.clickThroughUrl}]]></ClickThrough>` : "";
  const mediaXml = ad.mediaUrl
    ? `<MediaFile id="media-1" delivery="progressive" type="video/mp4" bitrate="1500" width="1920" height="1080" scalable="true" maintainAspectRatio="true">
         <![CDATA[${ad.mediaUrl}]]>
       </MediaFile>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Ad id="${ad.id}">
    <InLine>
      <AdSystem version="1.0">FamilyFlix AVOD Ad Server</AdSystem>
      <AdTitle><![CDATA[${ad.title}]]></AdTitle>
      <Description><![CDATA[${ad.sponsorBadgeText}]]></Description>
      <Error><![CDATA[${baseUrl}${ad.trackingUrls.start}&error=1]]></Error>
      <Impression id="imp-1"><![CDATA[${baseUrl}${ad.trackingUrls.start}]]></Impression>
      <Creatives>
        <Creative id="creative-${ad.creativeId}" sequence="1">
          <Linear>
            <Duration>00:00:${ad.durationSeconds.toString().padStart(2, "0")}</Duration>
            <TrackingEvents>
              <Tracking event="start"><![CDATA[${baseUrl}${ad.trackingUrls.start}]]></Tracking>
              <Tracking event="firstQuartile"><![CDATA[${baseUrl}${ad.trackingUrls.firstQuartile}]]></Tracking>
              <Tracking event="midpoint"><![CDATA[${baseUrl}${ad.trackingUrls.midpoint}]]></Tracking>
              <Tracking event="thirdQuartile"><![CDATA[${baseUrl}${ad.trackingUrls.thirdQuartile}]]></Tracking>
              <Tracking event="complete"><![CDATA[${baseUrl}${ad.trackingUrls.complete}]]></Tracking>
              <Tracking event="skip"><![CDATA[${baseUrl}${ad.trackingUrls.skip}]]></Tracking>
            </TrackingEvents>
            <VideoClicks>
              ${clickThrough}
              <ClickTracking><![CDATA[${baseUrl}${ad.trackingUrls.click}]]></ClickTracking>
            </VideoClicks>
            <MediaFiles>
              ${mediaXml}
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;
}

// -------------------------------------------------------------
// 5. VMAP 1.0 (VIDEO MULTIPLE AD PLAYLIST) GENERATOR
// -------------------------------------------------------------
export function generateVmapXml(cuePoints: CuePointItem[], slug: string, baseUrl = "https://familyflix.demuregram.com"): string {
  const breaks = cuePoints.map((cp, idx) => {
    const hours = Math.floor(cp.timestampSeconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((cp.timestampSeconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (cp.timestampSeconds % 60).toString().padStart(2, "0");
    const offset = `${hours}:${mins}:${secs}`;

    return `  <vmap:AdBreak timeOffset="${offset}" breakType="linear" breakId="midroll-${idx + 1}">
    <vmap:AdSource id="ad-source-${idx + 1}" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${baseUrl}/api/v1/ads/vast?placement=midroll&slug=${slug}&time=${cp.timestampSeconds}]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0">
  <vmap:AdBreak timeOffset="start" breakType="linear" breakId="preroll">
    <vmap:AdSource id="ad-source-preroll" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${baseUrl}/api/v1/ads/vast?placement=preroll&slug=${slug}]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
${breaks}
</vmap:VMAP>`;
}
