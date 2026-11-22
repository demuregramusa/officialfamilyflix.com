import { db, movies, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface MonetizationConfig {
  vastAdTagUrl: string;
  vastAdTiming: "pre-roll" | "mid-roll" | "all";
  vastAdFormat: "vast_4_0" | "vast_3_0" | "vmap_1_0";
  adsTxtContent: string;
  googleVerificationMeta: string;
  mediaNetVerification: string;
  customHtmlVerification: string;
  gdprConsentEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  dnsTxtRecord: string;
  // Payment Gateways (PayPal & Whop)
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalPlanId: string;
  paypalEmail: string;
  whopEnabled: boolean;
  whopCheckoutUrl: string;
  whopApiKey: string;
}

export const DEFAULT_ADS_TXT = `# FamilyFlix Authorized Digital Sellers (ads.txt)
# Compliant with IAB Tech Lab ads.txt Specification
# https://iabtechlab.com/ads-txt/
google.com, pub-4920492849204928, DIRECT, f08c47fec0942fa0
magnite.com, 14920, DIRECT, 8537b01d368e730b
pubmatic.com, 158291, DIRECT, 5d62403b186f2ace
spotxchange.com, 294819, DIRECT, 7842c7e0f39f21e6
medianet.com, 8CU68912, DIRECT, 8cu68912
freewheel.tv, 10294, DIRECT, a1b2c3d4e5f6
`;

export const DEFAULT_MONETIZATION: MonetizationConfig = {
  vastAdTagUrl: "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=",
  vastAdTiming: "pre-roll",
  vastAdFormat: "vast_4_0",
  adsTxtContent: DEFAULT_ADS_TXT,
  googleVerificationMeta: "google-site-verification=familyflix-production-domain-verification-2026",
  mediaNetVerification: "medianet-site-verify-familyflix-982749",
  customHtmlVerification: "google4920492849204928.html",
  gdprConsentEnabled: true,
  watermarkEnabled: true,
  watermarkText: "FamilyFlix",
  dnsTxtRecord: "v=spf1 include:_spf.google.com ~all; google-site-verification=familyflix-verify-2026",
  paypalEnabled: true,
  paypalClientId: "BAA_FAMILYFLIX_PAYPAL_CLIENT_ID",
  paypalPlanId: "P-5ML4271244454362WXNWU5NQ",
  paypalEmail: "iam23yhb@gmail.com",
  whopEnabled: true,
  whopCheckoutUrl: "https://whop.com/checkout/plan_familyflix_vip",
  whopApiKey: "whop_live_api_familyflix_key",
};

export async function getMonetizationConfig(): Promise<MonetizationConfig> {
  try {
    const [record] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
    const value = (record?.value || {}) as Record<string, any>;
    const monetization = value.monetization || {};

    return {
      vastAdTagUrl: monetization.vastAdTagUrl ?? DEFAULT_MONETIZATION.vastAdTagUrl,
      vastAdTiming: monetization.vastAdTiming ?? DEFAULT_MONETIZATION.vastAdTiming,
      vastAdFormat: monetization.vastAdFormat ?? DEFAULT_MONETIZATION.vastAdFormat,
      adsTxtContent: monetization.adsTxtContent ?? DEFAULT_MONETIZATION.adsTxtContent,
      googleVerificationMeta: monetization.googleVerificationMeta ?? DEFAULT_MONETIZATION.googleVerificationMeta,
      mediaNetVerification: monetization.mediaNetVerification ?? DEFAULT_MONETIZATION.mediaNetVerification,
      customHtmlVerification: monetization.customHtmlVerification ?? DEFAULT_MONETIZATION.customHtmlVerification,
      gdprConsentEnabled: monetization.gdprConsentEnabled ?? DEFAULT_MONETIZATION.gdprConsentEnabled,
      watermarkEnabled: monetization.watermarkEnabled ?? DEFAULT_MONETIZATION.watermarkEnabled,
      watermarkText: monetization.watermarkText ?? DEFAULT_MONETIZATION.watermarkText,
      dnsTxtRecord: monetization.dnsTxtRecord ?? DEFAULT_MONETIZATION.dnsTxtRecord,
      paypalEnabled: monetization.paypalEnabled ?? DEFAULT_MONETIZATION.paypalEnabled,
      paypalClientId: monetization.paypalClientId ?? DEFAULT_MONETIZATION.paypalClientId,
      paypalPlanId: monetization.paypalPlanId ?? DEFAULT_MONETIZATION.paypalPlanId,
      paypalEmail: monetization.paypalEmail ?? DEFAULT_MONETIZATION.paypalEmail,
      whopEnabled: monetization.whopEnabled ?? DEFAULT_MONETIZATION.whopEnabled,
      whopCheckoutUrl: monetization.whopCheckoutUrl ?? DEFAULT_MONETIZATION.whopCheckoutUrl,
      whopApiKey: monetization.whopApiKey ?? DEFAULT_MONETIZATION.whopApiKey,
    };
  } catch (error) {
    logger.warn({ err: error }, "Failed to load monetization config, using defaults");
    return DEFAULT_MONETIZATION;
  }
}

export async function saveMonetizationConfig(config: Partial<MonetizationConfig>, userId?: string): Promise<MonetizationConfig> {
  const current = await getMonetizationConfig();
  const merged: MonetizationConfig = { ...current, ...config };

  const [record] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
  const existingValue = (record?.value || {}) as Record<string, any>;
  const newValue = {
    ...existingValue,
    monetization: merged,
  };

  await db.insert(siteSettings).values({
    id: "default",
    value: newValue,
    updatedBy: userId || null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: siteSettings.id,
    set: { value: newValue, updatedBy: userId || null, updatedAt: new Date() },
  });

  return merged;
}

export function generateRobotsTxt(baseUrl = "http://localhost:5000"): string {
  return `# FamilyFlix Search & Bot Crawler Configuration
# Allows indexing of all public domain movies and episodic TV series
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth/

# Ad network bot permissions for content review
User-agent: Googlebot
Allow: /
User-agent: Mediapartners-Google
Allow: /
User-agent: AdsBot-Google
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
}

export async function generateSitemapXml(baseUrl = "http://localhost:5000"): Promise<string> {
  const now = new Date().toISOString().split("T")[0];

  const staticPages = [
    { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${baseUrl}/movies`, priority: "0.9", changefreq: "daily" },
    { loc: `${baseUrl}/tv-shows`, priority: "0.9", changefreq: "daily" },
    { loc: `${baseUrl}/about`, priority: "0.7", changefreq: "monthly" },
    { loc: `${baseUrl}/terms`, priority: "0.6", changefreq: "monthly" },
    { loc: `${baseUrl}/privacy`, priority: "0.6", changefreq: "monthly" },
    { loc: `${baseUrl}/dmca`, priority: "0.6", changefreq: "monthly" },
  ];

  let titleUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [];
  try {
    const published = await db.select({
      slug: movies.slug,
      updatedAt: movies.updatedAt,
      kind: movies.kind,
    }).from(movies).where(eq(movies.status, "published")).limit(500);

    titleUrls = published.map((t) => ({
      loc: `${baseUrl}/title/${t.slug}`,
      priority: t.kind === "series" ? "0.85" : "0.8",
      changefreq: "weekly",
      lastmod: t.updatedAt ? new Date(t.updatedAt).toISOString().split("T")[0] : now,
    }));
  } catch (error) {
    logger.warn({ err: error }, "Failed to query published titles for sitemap");
  }

  const allUrls = [...staticPages, ...titleUrls];

  const xmlEntries = allUrls.map((u) => {
    return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${(u as any).lastmod || now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}
