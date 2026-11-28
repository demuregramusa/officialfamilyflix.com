import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, Redirect, Route, Router, Switch, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Hls from "hls.js";
import { Upload as TusUpload } from "tus-js-client";
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronLeft, CircleHelp, Clapperboard, Clock3,
  Copyright, FileCheck2, Film, Flag, History, Info, LayoutDashboard, LibraryBig,
  LockKeyhole, Menu, Play, Search, Settings2, ShieldAlert, ShieldCheck,
  Sparkles, Upload, UserRound, UsersRound, Volume2, X,
  Share2, Download, CalendarCheck, BadgeCheck, Bot, Zap, DollarSign, Loader2, Code2,
} from "lucide-react";
import {
  useAddTitleRightsAsset, useAddTitleSubtitle, useCreateAdminTitle,
  useCreateCloudflareUpload, useCreateStaff, useDecideCopyrightCase,
  useDeleteAdminTitle, useDeleteTitleSubtitle, useGetAdminDashboard,
  useGetAdminSettings, useGetAdminTitle, useGetCopyrightCase, useGetEpisodePlayback, useGetPlayback,
  useGetEpisodePlaybackProgress, useGetPlaybackProgress,
  useGetAdminArchiveSources,
  useGetPublicTitle, useGetSiteConfig, useGetUserPreferences,
  useHealthCheck, useImportTitles, useListAdminActivity, useListAdminTitles,
  useListCopyrightCases, useListPublicTitles, useListRepeatInfringers,
  useListStaff, useListTitleRightsAssets, useListTitleSubtitles,
  usePublishAdminTitle, useRecordRepeatInfringer, useReviewTitleRights, useSaveUserPreferences,
  useSaveEpisodePlaybackProgress, useSavePlaybackProgress,
  usePreviewCopyrightCaseCommunication, useRetryCopyrightCaseCommunication,
  useSendCopyrightCaseCommunication,
  useSetTitleStream, useSubmitCopyrightReport, useSubmitCounterNotice,
  useSyncCloudflareStream, useUpdateAdminSettings, useUpdateAdminTitle,
  getCuratedPublicDomainTitles,
  useUpdateStaff, getGetAdminDashboardQueryKey, getGetAdminSettingsQueryKey,
  getGetAdminTitleQueryKey, getGetCopyrightCaseQueryKey, getGetPlaybackQueryKey,
  getGetEpisodePlaybackProgressQueryKey, getGetPlaybackProgressQueryKey,
  getGetAdminArchiveSourcesQueryKey,
  getGetEpisodePlaybackQueryKey, getGetPublicTitleQueryKey, getGetSiteConfigQueryKey,
  getGetUserPreferencesQueryKey, getListAdminTitlesQueryKey,
  getListCopyrightCasesQueryKey, getListPublicTitlesQueryKey,
  getListRepeatInfringersQueryKey, getListStaffQueryKey,
  getListTitleRightsAssetsQueryKey, getListTitleSubtitlesQueryKey,
} from "@workspace/api-client-react";
import {
  AssetKind, ImportInputFormat, LicenseType,
  ReviewDecisionDecision, StaffInputRole, StaffUpdateRole, TitleKind,
} from "@workspace/api-client-react";
import type {
  CopyrightCaseCommunicationPreview, CopyrightCaseCommunicationReview,
  PublicTitle, PublicTitleDetail, RightsInput,
} from "@workspace/api-client-react";
import { authClient } from "./lib/auth-client";
import { Hero } from "@/components/familyflix/hero";
import { BrowseHeader, GenreChips, PosterGrid } from "@/components/familyflix/browse";
import { PosterCard, posterSize } from "@/components/familyflix/poster-card";
import { TitleRow } from "@/components/familyflix/title-row";
import { TubiPlayer } from "@/components/familyflix/tubi-player";
import { ShareButton } from "@/components/familyflix/share-button";
import { ProfileProvider, useProfile } from "@/lib/profile-context";
import { ProfileMenu } from "@/components/familyflix/profile-menu";
import { CategoriesMenu } from "@/components/familyflix/categories-menu";
import { cn } from "@/lib/utils";
import type { Title as CatalogTitle } from "@/lib/catalog-types";
import { ArchiveImportPanel } from "@/components/admin/archive-import-panel";
import { ArchiveSourcePanel } from "@/components/admin/archive-source-panel";
import { SeriesEpisodeManager } from "@/components/admin/series-episode-manager";
import { ProductionImporterDashboard } from "@/components/admin/production-importer-dashboard";
import { StudioAdminShell } from "@/components/admin/studio-admin-shell";
import { curatedPublicDomainTitles } from "@/lib/curated-public-domain-titles";
import {
  getNextPlaybackTarget,
  getResumePosition,
  startAutoplayCountdown,
} from "@/lib/playback-controls";
import { ContinueWatchingRow, saveWatchProgress, getSavedWatchProgress } from "@/components/familyflix/continue-watching-row";
import { LikeDislikeButtons } from "@/components/familyflix/like-dislike";
import { ReportIssueModal } from "@/components/familyflix/report-issue-modal";
import { AccountSettingsPage } from "@/components/familyflix/account-settings";
import { ModeratorPortal } from "@/components/familyflix/moderator-portal";
import { AdminAnalyticsDashboard } from "@/components/familyflix/admin-analytics";
import { AdBreakManager } from "@/components/familyflix/ad-manager";
import { UserManager } from "@/components/familyflix/user-manager";
import { BrandLogo } from "@/components/familyflix/logo";
import { SubscriptionProvider, useSubscription } from "@/lib/subscription-context";
import { SubscriptionModal } from "@/components/familyflix/subscription-modal";
import { ShareModal } from "@/components/familyflix/share-modal";
import { AvatarPickerModal } from "@/components/familyflix/avatar-picker-modal";
import { AIAssistantModal } from "@/components/familyflix/ai-assistant-modal";
import { DemureEcosystemSpotlight } from "@/components/familyflix/demure-spotlight";
import { AdminMonetization } from "@/components/familyflix/admin-monetization";
import { CookieBanner } from "@/components/familyflix/cookie-banner";
import { AiConciergeWidget } from "@/components/familyflix/ai-concierge-widget";
import { AdminAiConciergePage } from "@/components/familyflix/admin-ai-concierge";
import { HomeView } from "@/components/familyflix/home-view";
import { CategoryPage } from "@/components/familyflix/category-page";
import { CategoriesDirectory } from "@/components/familyflix/categories-directory";
import { DeveloperHome } from "@/components/developer/developer-home";
import { DeveloperDashboard } from "@/components/developer/developer-dashboard";
import { DeveloperKeys } from "@/components/developer/developer-keys";
import { DeveloperPlayground } from "@/components/developer/developer-playground";
import { DeveloperBilling } from "@/components/developer/developer-billing";
import { DeveloperCredits } from "@/components/developer/developer-credits";
import { DeveloperDocs } from "@/components/developer/developer-docs";
import { AdminDeveloperManager } from "@/components/familyflix/admin-developer-manager";

const genres = ["Adventure", "Animation", "Comedy", "Documentary", "Drama", "Family", "Fantasy", "History", "Mystery", "Music", "Science fiction"];
const inputClass = "field";
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024 * 1024;
const stamp = (s?: string | null) => s ? new Date(s).toLocaleDateString() : "Not specified";
const errorText = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";
const isoDateTime = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : null;
function Brand() {
  const { isKidsMode } = useProfile();
  return <Link href="/" className="brand-lockup" data-testid="link-familyflix-home" aria-label="FamilyFlix home">
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] shadow-[0_6px_18px_rgba(0,149,246,0.28)]", isKidsMode && "ring-2 ring-amber-400/80")}>
      <img src="/icon-192.png" alt="" aria-hidden="true" className="size-full object-cover" />
    </span>
    <span>
      <span className="brand-word">family<b>flix</b></span>
      {isKidsMode ? (
        <span className="ml-1.5 rounded-md bg-gradient-to-r from-amber-400 to-pink-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
          Kids
        </span>
      ) : (
        <span className="platform-label">by DemureGram</span>
      )}
    </span>
  </Link>;
}
function Header() {
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { isKidsMode, toggleKidsMode, exitKidsMode } = useProfile();
  const { isSubscribed, openSubscriptionModal } = useSubscription();
  const links = [
    ["/", "Home"],
    ["/movies", "Movies"],
    ["/tv-shows", "TV Shows"],
    ["/my-list", "My List"],
    ["/developers", "Developers"],
  ];
  return <>
    <div className="sticky top-0 z-50 w-full">
      {isKidsMode ? (
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black text-xs font-bold shadow-md">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={14} className="shrink-0 animate-spin text-amber-200" />
          <span className="truncate">You are exploring FamilyFlix Kids — Safe, age-appropriate family movies and animation!</span>
        </div>
        <button
          type="button"
          onClick={exitKidsMode}
          className="shrink-0 rounded-full bg-black/80 px-3 py-0.5 text-[11px] font-bold text-white transition hover:bg-black"
        >
          Exit Kids
        </button>
      </div>
    ) : null}
    <header className="topbar">
      <Brand />
      <nav className="main-nav" aria-label="Main navigation">
        <CategoriesMenu />
        {links.map(([href, label]) => <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`} data-testid={`link-nav-${label.toLowerCase().replace(" ", "-")}`}>{label}</Link>)}
        <button
          type="button"
          onClick={toggleKidsMode}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shrink-0",
            isKidsMode
              ? "bg-amber-400 text-black shadow-md hover:bg-amber-300"
              : "text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
          )}
          data-testid="button-nav-kids"
        >
          <Sparkles size={13} />
          <span>Kids</span>
        </button>
      </nav>
      <div className="top-actions">
        {/* VIP Pass Trigger */}
        {!isSubscribed && (
          <button
            type="button"
            onClick={openSubscriptionModal}
            className="hidden xl:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 px-3 py-1 text-xs font-black text-black hover:brightness-110 transition shadow-md shrink-0 whitespace-nowrap"
            title="Unlock FamilyFlix VIP (Ad-Free, 4K, Offline)"
          >
            <Sparkles size={13} />
            <span>VIP Pass</span>
          </button>
        )}

        <Link href="/search" className="icon-link" aria-label="Search titles" data-testid="link-search"><Search size={19} /></Link>
        <ProfileMenu
          onOpenAvatarPicker={() => setAvatarPickerOpen(true)}
        />
        <button className="quiet-button menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} data-testid="button-mobile-menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open && (
        <nav
          className="mobile-nav absolute inset-x-0 top-full z-40 flex-col gap-1 border-b border-white/10 bg-[#12161b]/95 p-3 shadow-2xl backdrop-blur-2xl animate-fade-in"
          aria-label="Mobile navigation"
        >
          {[...links, ["/categories", "Categories"], ["/about", "About"]].map(([href, label]) => (
            <Link
              onClick={() => setOpen(false)}
              key={href}
              className={cn(
                "flex h-10 w-full items-center rounded-xl px-3 text-[13px] font-medium leading-5 transition",
                path === href
                  ? "bg-white/[0.12] text-[#f5f5f5]"
                  : "text-[#f5f5f5]/85 hover:bg-white/[0.08] hover:text-[#f5f5f5]"
              )}
              href={href}
              data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ","-")}`}
            >
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-white/[0.08]" />
          <button
            type="button"
            onClick={() => { openSubscriptionModal(); setOpen(false); }}
            className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-amber-300 transition hover:bg-amber-400/10"
          >
            FamilyFlix VIP (Ad-Free &amp; 4K)
          </button>
          <button
            type="button"
            onClick={() => { toggleKidsMode(); setOpen(false); }}
            className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-amber-300 transition hover:bg-amber-400/10"
            data-testid="link-mobile-kids"
          >
            {isKidsMode ? "Exit Kids Mode" : "Switch to Kids Mode"}
          </button>
        </nav>
      )}
    </header>
  </div>
  <AvatarPickerModal isOpen={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} />
  <SubscriptionModal />
</>;
}
function Footer() {
  return <footer className="app-footer">
    <div className="footer-brand">
      <Link href="/" className="footer-wordmark" aria-label="FamilyFlix by DemureGram home">family<span>flix</span></Link>
      <p>Films and television series, with rights verified and cleared for commercial AVOD streaming.</p>
      <small>© 2026 DemureGram LLC. All public domain and Creative Commons works remain with their respective rights holders.</small>
    </div>
    <nav className="footer-links" aria-label="Footer navigation">
      <div><strong>Explore</strong><Link href="/movies">Movies</Link><Link href="/tv-shows">TV Shows</Link><Link href="/my-list">My List</Link><Link href="/search">Search</Link></div>
      <div>
        <strong>Demure Platforms</strong>
        <a href="https://demuregram.com" target="_blank" rel="noopener noreferrer">DemureGram</a>
        <a href="https://brinn.demuregram.com" target="_blank" rel="noopener noreferrer">BRiNn Mobile</a>
        <a href="https://cashout.demuregram.com" target="_blank" rel="noopener noreferrer">CashOut Lock &amp; Reserve</a>
        <a href="https://chat.demuregram.com" target="_blank" rel="noopener noreferrer">ChatDPI AI</a>
      </div>
      <div><strong>Information</strong><Link href="/about" data-testid="link-footer-about">About</Link><Link href="/terms" data-testid="link-footer-terms">Terms</Link><Link href="/privacy" data-testid="link-footer-privacy">Privacy</Link><Link href="/dmca" data-testid="link-footer-dmca">DMCA Policy</Link><Link href="/copyright/report" data-testid="link-footer-copyright">Copyright</Link></div>
    </nav>
  </footer>;
}
function Shell({ children, admin = false, fullBleed = false }: { children: ReactNode; admin?: boolean; fullBleed?: boolean }) {
  if (admin) {
    return <StudioAdminShell>{children}</StudioAdminShell>;
  }
  return <div className="site-shell"><Header /><main className={`page-content${fullBleed ? " page-content-full" : ""}`}>{children}</main><Footer /><CookieBanner /><DemureEcosystemSpotlight /></div>;
}
function AdminGate({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { data: sessionData, isPending } = authClient.useSession();
  const session = sessionData as unknown as { user?: { role?: string } } | null | undefined;
  const role = session?.user?.role;
  if (isPending) return <Shell admin><div className="skeleton" style={{ height: 240 }} aria-label="Checking studio access" /></Shell>;
  if (!session?.user) return <Redirect to="/auth/sign-in" />;
  if ((role !== "admin" && role !== "moderator") || (adminOnly && role !== "admin")) return <Shell admin><div className="permission-card" role="alert" data-testid="status-admin-forbidden"><span className="status warn">Permission required</span><h1>{adminOnly ? "Administrator access required." : "Staff access only."}</h1><p>You’re signed in, but this account does not have permission for this studio area. Contact an administrator through the configured platform process. The server remains authoritative for every admin operation.</p><Link href="/" className="button-secondary">Return to catalog</Link></div></Shell>;
  return <>{children}</>;
}
function Heading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  useEffect(() => {
    const pageTitle = `${title} | DemureGram — FamilyFlix`;
    const pageDescription = description?.trim() || "Discover rights-reviewed films and television in FamilyFlix, the DemureGram catalog.";
    document.title = pageTitle;
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const openGraphTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const openGraphDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const twitterTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (descriptionMeta) descriptionMeta.content = pageDescription;
    if (openGraphTitle) openGraphTitle.content = pageTitle;
    if (openGraphDescription) openGraphDescription.content = pageDescription;
    if (twitterTitle) twitterTitle.content = pageTitle;
    if (twitterDescription) twitterDescription.content = pageDescription;
  }, [title, description]);
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
function LoadingGrid() { return <div className="title-grid" aria-label="Loading approved catalog">{[0,1,2,3,4].map(i => <div key={i} className="skeleton" />)}</div>; }
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert" data-testid="status-error"><strong>We couldn’t load this view.</strong><p>{message}</p>{retry && <button className="button-secondary" onClick={retry} data-testid="button-retry">Try again</button>}</div>;
}
function Empty({ title, children, icon = <Film size={20} /> }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state" data-testid="status-empty"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{children}</p></div>;
}
function toCatalogTitle(title: PublicTitle | PublicTitleDetail): CatalogTitle {
  const detail = title as Partial<PublicTitleDetail>;
  const minutes = detail.durationMinutes ?? null;
  const duration = minutes
    ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ""}${minutes % 60 ? `${minutes % 60}m` : ""}`.trim()
    : undefined;
  return {
    slug: title.slug,
    name: title.name,
    tagline: detail.tagline ?? "",
    year: title.year ?? 0,
    type: title.kind,
    rating: detail.rating || "",
    score: 0,
    ...(duration ? { duration } : {}),
    genres: title.genres,
    synopsis: title.synopsis,
    cast: detail.cast ?? [],
    creator: title.creatorAttribution,
    image: title.posterUrl ? title.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") : "photo-1489599849927-2ee91cede3ba",
    ...(title.posterUrl ? { poster: title.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") } : {}),
    ...(detail.backdropUrl || title.posterUrl ? { backdrop: (detail.backdropUrl || title.posterUrl)!.replace("https://yts.pw/", "https://img.yts.pw/") } : {}),
    palette: ["#100b1a", "#6d28ff"],
    ...(title.featured ? { featured: true } : {}),
  };
}
function Poster({ title, className = "" }: { title: Pick<PublicTitle, "id" | "name" | "kind"> & { posterUrl?: string | null }; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = !failed && title.posterUrl ? title.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") : null;
  if (image) {
    return (
      <div
        className={`poster has-image relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl ${className}`}
        data-testid={`poster-title-${title.id}`}
        aria-label={`${title.name} poster art`}
      >
        <img
          src={image}
          alt={title.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
        <span className="poster-stamp relative z-10">{title.kind === "series" ? "Series" : title.kind}</span>
      </div>
    );
  }
  return (
    <div
      className={`poster relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-gradient-to-br from-[#281a42] to-[#120d1e] flex flex-col justify-between p-4 ${className}`}
      data-testid={`poster-title-${title.id}`}
      aria-label={`${title.name} artwork placeholder`}
    >
      <span className="poster-stamp">{title.kind === "series" ? "Series" : title.kind}</span>
      <span className="poster-title font-semibold text-white/90 line-clamp-2 text-sm">{title.name}</span>
      <span className="poster-open self-end text-white/60"><ArrowRight size={15} /></span>
    </div>
  );
}
function TitleCards({ titles }: { titles: PublicTitle[] }) {
  return <PosterGrid items={titles.map(toCatalogTitle)} />;
}
function EmptyOriginalHero() {
  const { isKidsMode, exitKidsMode } = useProfile();
  return <section className="relative flex min-h-[500px] w-full items-end overflow-hidden bg-[#0c1014] sm:min-h-[580px] lg:min-h-[640px]" data-testid="section-featured-catalog">
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{
      background: isKidsMode
        ? "radial-gradient(58% 65% at 78% 30%, rgba(245,158,11,.25), transparent 68%), radial-gradient(40% 45% at 78% 58%, rgba(236,72,153,.2), transparent 70%), linear-gradient(90deg,#0c1014 0%,rgba(8,6,15,.84) 46%,rgba(8,6,15,.18) 100%)"
        : "radial-gradient(58% 65% at 78% 30%, rgba(109,40,255,.34), transparent 68%), radial-gradient(40% 45% at 78% 58%, rgba(255,46,136,.15), transparent 70%), linear-gradient(90deg,#0c1014 0%,rgba(8,6,15,.84) 46%,rgba(8,6,15,.18) 100%)"
    }} />
    <div aria-hidden className="pointer-events-none absolute right-[10%] top-[12%] hidden aspect-[.72] w-[29%] rotate-[4deg] rounded-[48%_48%_12px_12px] border border-white/20 bg-gradient-to-br from-[#38265f] via-[#1b1230] to-[#100b17] shadow-2xl md:block" />
    <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 md:px-8 md:pb-16 xl:px-12">
      <div className="max-w-[660px] animate-fade-up">
        <span className="eyebrow">{isKidsMode ? "FamilyFlix Kids Zone" : "100% Free with Ads"}</span>
        <h1 className="mt-4 max-w-[700px] text-[clamp(2.5rem,6.5vw,5.6rem)] font-black uppercase leading-[.9] tracking-[-.055em] text-white text-shadow-hero">
          {isKidsMode ? "Kids Movies & Fun" : "FamilyFlix"}
        </h1>
        <p className="mt-4 max-w-[54ch] text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
          {isKidsMode
            ? "Safe, age-appropriate family movies, animated adventures, and cartoons. Streaming 100% free with zero subscription fees."
            : "Stream thousands of hit movies, binge-worthy TV series, and classic cinema 100% free with ads. No subscription or credit card needed."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/movies" className="button" data-testid="button-browse-approved"><Clapperboard size={16} /> Browse movies</Link>
          {isKidsMode ? (
            <button type="button" onClick={exitKidsMode} className="button-secondary"><Sparkles size={15} /> Exit Kids Mode</button>
          ) : (
            <Link href="/tv-shows" className="button-secondary"><Film size={15} /> TV Shows</Link>
          )}
        </div>
      </div>
    </div>
  </section>;
}
function Catalog({ kind, query, home = false }: { kind?: "movie" | "series"; query?: string; home?: boolean }) {
  const { isKidsMode } = useProfile();
  const [accumulated, setAccumulated] = useState<CatalogTitle[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reset pagination state whenever kind or query changes
  useEffect(() => {
    setAccumulated([]);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [kind, query]);

  const params = useMemo(() => ({ ...(kind ? { kind } : {}), ...(query ? { query } : {}), limit: 100 }), [kind, query]);
  const q = useListPublicTitles(params, { query: { enabled: !home, queryKey: getListPublicTitlesQueryKey(params) } });
  const baseTitles = useMemo(() => (q.data ?? []).map(toCatalogTitle), [q.data]);
  const rawTitles = accumulated.length > 0 ? accumulated : baseTitles;

  const titles = useMemo(() => {
    if (!isKidsMode) return rawTitles;
    const allowed = ["animation", "family", "comedy", "adventure", "fantasy", "music"];
    const blocked = ["horror", "crime", "thriller", "war", "erotic"];
    const blockedRatings = ["R", "TV-MA", "NC-17", "18+"];
    return rawTitles.filter(t => {
      if (t.rating && blockedRatings.includes(t.rating)) return false;
      if (t.genres && t.genres.some(g => blocked.some(b => g.toLowerCase().includes(b)))) return false;
      return (
        (t.genres && t.genres.some(g => allowed.some(a => g.toLowerCase().includes(a)))) ||
        ["G", "PG", "TV-Y", "TV-G", "TV-Y7", "TV-PG"].includes(t.rating || "") ||
        t.type === "series"
      );
    });
  }, [rawTitles, isKidsMode]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const currentList = accumulated.length > 0 ? accumulated : baseTitles;
      const currentOffset = currentList.length;
      const url = new URL("/api/v1/titles", window.location.origin);
      url.searchParams.set("limit", "100");
      url.searchParams.set("offset", String(currentOffset));
      if (kind) url.searchParams.set("kind", kind);
      if (query) url.searchParams.set("query", query);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load more titles");
      const data: PublicTitle[] = await res.json();
      if (!data || data.length === 0) {
        setHasMore(false);
      } else {
        if (data.length < 100) {
          setHasMore(false);
        }
        const fresh = data.map(toCatalogTitle);
        setAccumulated(prev => {
          const base = prev.length > 0 ? prev : baseTitles;
          const seen = new Set(base.map(t => t.slug));
          const additions = fresh.filter(t => !seen.has(t.slug));
          return [...base, ...additions];
        });
      }
    } catch (err) {
      console.error("Error loading more titles:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const featured = titles.filter(t => t.featured).slice(0, 5);
  const heroTitles = featured.length ? featured : titles.slice(0, 5);

  if (home) {
    return (
      <Shell fullBleed>
        <HomeView />
      </Shell>
    );
  }

  const activeGenre = new URLSearchParams(window.location.search).get("genre") || "";
  const baseTubiGenres = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
    "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
    "Romance", "Science fiction", "Thriller", "Western"
  ];
  const allGenres = Array.from(new Set([...baseTubiGenres, ...titles.flatMap(t => t.genres)])).sort((a, b) => a.localeCompare(b));
  const shown = activeGenre
    ? titles.filter(t => t.genres.some(g => g.toLowerCase().includes(activeGenre.toLowerCase())))
    : titles;
  const pageTitle = query ? `Results for “${query}”` : isKidsMode ? "Kids Movies & Series" : kind === "movie" ? "Movies" : kind === "series" ? "TV Shows" : "FamilyFlix";

  const totalCountLabel = useMemo(() => {
    if (q.isLoading || q.isError) return undefined;
    if (activeGenre) {
      return `${shown.length} ${shown.length === 1 ? "title" : "titles"}`;
    }
    if (kind === "movie") {
      return `Showing ${shown.length} of 23,163 Movies`;
    }
    if (kind === "series") {
      return `Showing ${shown.length} of 109 TV Series`;
    }
    return `Showing ${shown.length} of 23,272 Titles`;
  }, [q.isLoading, q.isError, activeGenre, shown.length, kind]);

  return <Shell>
    <BrowseHeader eyebrow={query ? "Search FamilyFlix" : isKidsMode ? "FamilyFlix Kids" : "All Categories"} title={pageTitle} description={query ? "Search titles approved for streaming on FamilyFlix." : isKidsMode ? "Safe and kid-friendly entertainment for all ages." : "Browse thousands of free movies and TV series across every genre."} count={totalCountLabel} />
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-2 sm:px-6 md:px-8 xl:px-12">
      {!query && <GenreChips genres={allGenres} active={activeGenre} basePath={kind === "series" ? "/tv-shows" : "/movies"} />}
      {q.isLoading ? <LoadingGrid /> : q.isError ? <ErrorBox message={errorText(q.error)} retry={() => q.refetch()} /> : shown.length ? <>
        <PosterGrid items={shown} />
        {!activeGenre && hasMore && shown.length >= 100 && (
          <div className="mt-12 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Loading more titles...
                </>
              ) : (
                <>
                  Load Next 100 {kind === "series" ? "TV Shows" : "Movies"} ({shown.length} loaded)
                </>
              )}
            </button>
            <p className="text-xs text-white/40">
              Browse through all {kind === "series" ? "109 TV series" : "23,163 full-length movies"} in the FamilyFlix catalog
            </p>
          </div>
        )}
      </> : <Empty title={query ? "No matching titles" : "No titles found in this category"} icon={<Clapperboard size={20} />}>{query ? "Try searching another title, actor or category." : "Explore other categories or check back soon."}</Empty>}
      <section className="notice" style={{ marginTop: 36 }} data-testid="status-rights-transparency"><ShieldCheck size={18} /><span><strong>100% Free with ads.</strong> FamilyFlix displays reviewed titles under approved Creative Commons and public domain terms.</span></section>
    </div>
  </Shell>;
}
function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "highly_rated" | "new_arrivals" | "leaving_soon">("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const q = useListPublicTitles({ query: query.trim() || undefined, limit: 100 });
  const rawTitles = (q.data ?? []).map(toCatalogTitle);

  const searchGenres = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
    "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
    "Romance", "Science fiction", "Thriller", "Western"
  ];

  const filteredTitles = useMemo(() => {
    return rawTitles.filter((t) => {
      // Genre filter
      if (selectedGenre && !t.genres.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()))) {
        return false;
      }
      // Tab filter
      if (activeTab === "highly_rated") {
        return (t as any).score >= 70 || ["G", "PG", "PG-13"].includes(t.rating || "");
      }
      if (activeTab === "new_arrivals") {
        return t.year >= 2020 || t.featured;
      }
      if (activeTab === "leaving_soon") {
        return t.badge === "leaving-soon" || t.featured;
      }
      return true;
    });
  }, [rawTitles, selectedGenre, activeTab]);

  return (
    <Shell>
      <Heading
        eyebrow="Explore FamilyFlix Catalog"
        title="Find Movies & TV Series"
        description="Search across thousands of free, rights-cleared titles with real-time genre and category filters."
      />

      {/* Search Input Bar */}
      <div className="relative max-w-2xl mb-6">
        <Search size={18} className="absolute left-4 top-3.5 text-white/40" />
        <input
          className="w-full rounded-2xl border border-white/15 bg-black/50 pl-11 pr-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, actor, director, or keyword…"
          data-testid="input-catalog-search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-3 grid size-6 place-items-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { id: "all", label: "All Titles" },
          { id: "highly_rated", label: "Highly Rated" },
          { id: "new_arrivals", label: "New Arrivals" },
          { id: "leaving_soon", label: "Leaving Soon" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition",
              activeTab === tab.id
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
        <button
          type="button"
          onClick={() => setSelectedGenre("")}
          className={cn(
            "rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition",
            !selectedGenre
              ? "bg-white/20 text-white font-bold"
              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          )}
        >
          All Genres
        </button>
        {searchGenres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setSelectedGenre(selectedGenre === g ? "" : g)}
            className={cn(
              "rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition",
              selectedGenre === g
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50 font-bold"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Results View */}
      {q.isLoading ? (
        <LoadingGrid />
      ) : q.isError ? (
        <ErrorBox message={errorText(q.error)} retry={() => q.refetch()} />
      ) : filteredTitles.length ? (
        <div>
          <div className="mb-3 text-xs font-semibold text-white/40">
            Found {filteredTitles.length} matching {filteredTitles.length === 1 ? "title" : "titles"}
          </div>
          <PosterGrid items={filteredTitles} />
        </div>
      ) : (
        <Empty
          title={query ? "No matching approved titles" : "No titles found"}
          icon={<Search size={19} />}
        >
          {query
            ? "Try another keyword, or clear your filters above."
            : "Explore other categories or check back soon."}
        </Empty>
      )}
    </Shell>
  );
}
function DetailPage({ slug }: { slug: string }) {
  const q = useGetPublicTitle(slug, { query: { enabled: !!slug, queryKey: getGetPublicTitleQueryKey(slug) } });
  const detail = q.data as PublicTitleDetail | undefined;
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const {
    isSubscribed,
    openSubscriptionModal,
    isPreOrdered,
    togglePreOrder,
    isDownloaded,
    saveToDevice,
  } = useSubscription();

  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem("ff-list") || "[]").includes(slug); } catch { return false; } });
  function toggleSaved() {
    let slugs: string[] = [];
    try { slugs = JSON.parse(localStorage.getItem("ff-list") || "[]"); } catch { slugs = []; }
    const next = saved ? slugs.filter(s => s !== slug) : [...new Set([...slugs, slug])];
    localStorage.setItem("ff-list", JSON.stringify(next));
    setSaved(!saved);
  }

  const [downloading, setDownloading] = useState(false);
  const handleSaveToDevice = async () => {
    if (!isSubscribed) {
      openSubscriptionModal();
      return;
    }
    if (!detail) return;
    setDownloading(true);
    await saveToDevice({
      slug: detail.slug,
      name: detail.name,
      posterUrl: detail.posterUrl || undefined,
    });
    setTimeout(() => setDownloading(false), 800);
  };

  const handlePreOrder = async () => {
    if (!isSubscribed) {
      openSubscriptionModal();
      return;
    }
    if (!detail) return;
    await togglePreOrder(detail.slug, detail.name);
  };

  if (q.isLoading) return <Shell><div className="detail-layout"><div className="skeleton detail-poster" /><div><div className="skeleton" style={{ height: 320 }} /></div></div></Shell>;
  if (q.isError || !detail) return <Shell><ErrorBox message={q.isError ? errorText(q.error) : "This title isn’t available in the approved catalog."} retry={() => q.refetch()} /></Shell>;

  const firstEpisode = detail.episodes && detail.episodes.length > 0 ? detail.episodes[0] : null;

  return <Shell><Link href="/" className="feature-line" data-testid="link-back-catalog"><ArrowLeft size={15} /> Back to catalog</Link>
    <div className="detail-layout" style={{ marginTop: 25 }}><Poster title={detail} className="detail-poster" /><div>
      <div className="flex items-center gap-2">
        <span className="eyebrow">Approved FamilyFlix title</span>
        {detail.kind === "series" && (
          <span className="rounded bg-purple-600/30 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300 border border-purple-500/30">
            TV Series
          </span>
        )}
      </div>
      <h1 className="display-title" style={{ marginTop: 10 }}>{detail.name}</h1>
      {detail.tagline && detail.tagline.trim() !== detail.synopsis?.trim() && (
        <p style={{ color: "hsl(19 83% 67%)", fontStyle: "italic" }}>{detail.tagline}</p>
      )}
      <div className="hero-meta">
        <span>{detail.year ?? "Year not listed"}</span>
        <span>·</span>
        <span>{detail.kind === "series" ? "Series" : detail.kind}</span>
        {detail.durationMinutes && <><span>·</span><span>{detail.durationMinutes} min</span></>}
        {detail.rating && <><span>·</span><span className="rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">{detail.rating}</span></>}
        <span>·</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/85">HD · English · [CC]</span>
      </div>
      <p style={{ maxWidth: 670, color: "hsl(260 10% 78%)", lineHeight: 1.8 }}>{detail.synopsis || "No synopsis has been provided."}</p>
      <p className="helper">Creator attribution: <strong style={{ color: "hsl(42 26% 92%)" }}>{detail.creatorAttribution || "Not supplied"}</strong></p>
      {detail.cast?.length > 0 && <p className="helper">Featuring: {detail.cast.join(", ")}</p>}

      {/* Main Action Bar */}
      <div className="form-actions flex flex-wrap items-center gap-2.5">
        {detail.kind === "series" ? (
          firstEpisode ? (
            <Link
              href={`/watch/${detail.slug}/${firstEpisode.id}`}
              className="button button-watch-now flex items-center gap-2"
              data-testid="button-play-series"
            >
              <Play size={15} fill="currentColor" /> Watch S{firstEpisode.seasonNumber}:E{firstEpisode.episodeNumber} Free
            </Link>
          ) : (
            <button disabled className="button opacity-60">
              Episodes Coming Soon
            </button>
          )
        ) : (
          <Link href={`/watch/${detail.slug}`} className="button button-watch-now flex items-center gap-2" data-testid="button-play-title">
            <Play size={15} fill="currentColor" /> Watch Now Free
          </Link>
        )}

        <button className="button-secondary flex items-center gap-2" onClick={toggleSaved} data-testid="button-save-title">
          <Bookmark size={15} /> {saved ? "Remove from my list" : "Save to my list"}
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          className="button-secondary flex items-center gap-2"
          data-testid="button-share-title"
        >
          <Share2 size={15} /> Share
        </button>

        {/* Pre-Order / Early Access */}
        <button
          type="button"
          onClick={handlePreOrder}
          className={cn(
            "button-secondary flex items-center gap-2",
            isPreOrdered(detail.slug) && "border-amber-400/50 bg-amber-400/15 text-amber-300"
          )}
          title={isPreOrdered(detail.slug) ? "Reserved for early release" : "Pre-order early access"}
        >
          <CalendarCheck size={15} className={isPreOrdered(detail.slug) ? "text-amber-400" : ""} />
          <span>{isPreOrdered(detail.slug) ? "Pre-Ordered ✓" : "Pre-Order"}</span>
        </button>

        {/* Save to Device (Offline Download) */}
        <button
          type="button"
          onClick={handleSaveToDevice}
          className={cn(
            "button-secondary flex items-center gap-2",
            isDownloaded(detail.slug) && "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
          )}
          title="Save to device for offline playback"
        >
          <Download size={15} className={downloading ? "animate-bounce" : ""} />
          <span>{isDownloaded(detail.slug) ? "Saved Offline ✓" : downloading ? "Saving..." : "Save to Device"}</span>
        </button>

        <LikeDislikeButtons slug={detail.slug} genres={detail.genres} />
        <button type="button" onClick={() => setReportModalOpen(true)} className="quiet-button flex items-center gap-1.5" data-testid="button-report-problem"><Flag size={14} /> Report Problem</button>
      </div>

      <ReportIssueModal slug={detail.slug} titleName={detail.name} isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        titleName={detail.name}
        slug={detail.slug}
        synopsis={detail.synopsis}
      />

      {/* Tubi-Style Season & Episode Selector */}
      {detail.kind === "series" && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#12161b] p-5 sm:p-6" data-testid="public-series-episodes">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">Episodes & Seasons</h2>
              <p className="text-xs text-white/50">Select an episode to stream immediately in our Tubi player</p>
            </div>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
              {detail.episodes?.length || 0} Episodes
            </span>
          </div>

          {detail.episodes && detail.episodes.length > 0 ? (
            <div className="mt-5 space-y-4">
              {[...new Set(detail.episodes.map((episode) => episode.seasonNumber))].map((seasonNumber) => {
                const seasonEpisodes = detail.episodes.filter((episode) => episode.seasonNumber === seasonNumber);
                const seasonName = seasonEpisodes[0]?.seasonName || `Season ${seasonNumber}`;
                return (
                  <div key={seasonNumber} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">
                      {seasonName}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {seasonEpisodes.map((episode) => (
                        <article
                          key={episode.id}
                          className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-purple-500/40 hover:bg-white/[0.06]"
                          data-testid={`public-episode-${episode.id}`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-black text-purple-300 border border-purple-500/30">
                                S{episode.seasonNumber} · E{episode.episodeNumber}
                              </span>
                              {episode.durationMinutes && (
                                <span className="text-[11px] text-white/50 font-medium">
                                  {episode.durationMinutes} min
                                </span>
                              )}
                            </div>
                            <h4 className="mt-2 text-sm font-bold text-white">
                              {episode.name}
                            </h4>
                            <p className="mt-1 text-xs text-white/60 line-clamp-2">
                              {episode.synopsis || "Full streaming episode available in HD."}
                            </p>
                          </div>
                          <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                            <Link
                              className="button flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold"
                              href={`/watch/${detail.slug}/${episode.id}`}
                              data-testid={`button-play-episode-${episode.id}`}
                            >
                              <Play size={12} fill="currentColor" /> Watch Episode
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setShareModalOpen(true);
                              }}
                              className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                            >
                              <Share2 size={12} /> Share
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="No episodes are currently available">Episodes will appear here once ready.</Empty>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/50" data-testid="status-rights-transparency">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-400" />
          Streamed under verified Creative Commons & public domain terms.
        </span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="font-semibold text-purple-400 hover:text-purple-300">
            Terms of Use
          </Link>
          <Link href="/about" className="font-semibold text-purple-400 hover:text-purple-300">
            Licensing & Attribution Policy
          </Link>
        </div>
      </div>
    </div></div>
  </Shell>;
}
function WatchPage({ slug, episodeId }: { slug: string; episodeId?: string }) {
  const { activeProfile } = useProfile();
  const [watchReportModalOpen, setWatchReportModalOpen] = useState(false);
  const lastSavedAtRef = useRef(0);
  const countdownCancelRef = useRef<(() => void) | null>(null);
  const [, navigate] = useLocation();
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { id?: string } } | null | undefined;
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef(userId);
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => {
    try { return localStorage.getItem("ff-autoplay") === "true"; } catch { return false; }
  });
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [playbackFailure, setPlaybackFailure] = useState("");

  const p = useGetPlayback(slug, { query: { enabled: !!slug && !episodeId, queryKey: getGetPlaybackQueryKey(slug), retry: false } });
  const episode = useGetEpisodePlayback(slug, episodeId ?? "", { query: {
    enabled: !!slug && !!episodeId,
    queryKey: getGetEpisodePlaybackQueryKey(slug, episodeId ?? ""),
    retry: false,
  } });
  const movieProgress = useGetPlaybackProgress(slug, { query: {
    enabled: !!userId && !episodeId,
    queryKey: [...getGetPlaybackProgressQueryKey(slug), userId ?? "signed-out"],
    retry: false,
  } });
  const episodeProgress = useGetEpisodePlaybackProgress(slug, episodeId ?? "", { query: {
    enabled: !!userId && !!episodeId,
    queryKey: [...getGetEpisodePlaybackProgressQueryKey(slug, episodeId ?? ""), userId ?? "signed-out"],
    retry: false,
  } });
  const saveMovieProgress = useSavePlaybackProgress();
  const saveEpisodeProgress = useSaveEpisodePlaybackProgress();
  const publicTitle = useGetPublicTitle(slug, { query: {
    enabled: !!slug,
    queryKey: getGetPublicTitleQueryKey(slug),
  } });
  const movies = useListPublicTitles({ kind: "movie", limit: 20 }, { query: { enabled: true } });
  const playback = episodeId ? episode.data : p.data;
  const isLoading = episodeId ? episode.isLoading : p.isLoading;
  const isError = episodeId ? episode.isError : p.isError;
  const progress = episodeId ? episodeProgress.data : movieProgress.data;
  const detail = publicTitle.data as PublicTitleDetail | undefined;

  const isSafeUrl = !!playback?.url && (
    (/^https?:/i.test(playback.url) && !/^(magnet:|torrent:)/i.test(playback.url)) ||
    (/^\/api\/playback\/[^/]+(?:\/episodes\/[^/]+)?\/media$/.test(playback.url) && !playback.url.startsWith("//"))
  );

  const nextTarget = getNextPlaybackTarget({
    slug,
    ...(episodeId ? { episodeId } : {}),
    episodes: publicTitle.data?.episodes ?? [],
    titles: movies.data ?? [],
  });

  const savedLocalProgress = useMemo(() => {
    return getSavedWatchProgress(activeProfile.id, slug, episodeId);
  }, [activeProfile.id, slug, episodeId]);

  const effectiveInitialTime = (progress?.progressSeconds && progress.progressSeconds > 0)
    ? progress.progressSeconds
    : savedLocalProgress;

  const promotedAdTitle = useMemo(() => {
    const candidate = movies.data?.find(m => m.slug !== slug);
    if (!candidate) return null;
    return {
      name: candidate.name,
      tagline: (candidate as any).tagline || "Free streaming on FamilyFlix",
      backdropUrl: (candidate as any).backdropUrl || candidate.posterUrl || undefined,
      posterUrl: candidate.posterUrl || undefined,
      slug: candidate.slug,
    };
  }, [movies.data, slug]);

  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ff-list") || "[]").includes(slug); } catch { return false; }
  });

  function toggleSaved() {
    let slugs: string[] = [];
    try { slugs = JSON.parse(localStorage.getItem("ff-list") || "[]"); } catch { slugs = []; }
    const next = saved ? slugs.filter(s => s !== slug) : [...new Set([...slugs, slug])];
    localStorage.setItem("ff-list", JSON.stringify(next));
    setSaved(!saved);
  }

  function handleProgressUpdate(currentTime: number, duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const now = Date.now();
    if (now - lastSavedAtRef.current < 8000) return;
    lastSavedAtRef.current = now;
    const durationSeconds = Math.max(1, Math.min(Math.floor(duration), 86400));
    const progressSeconds = Math.min(Math.floor(currentTime), durationSeconds);

    // Save locally for active profile
    saveWatchProgress(activeProfile.id, {
      slug,
      name: detail?.name || currentTitleName,
      posterUrl: detail?.posterUrl || playback?.posterUrl || undefined,
      backdropUrl: detail?.backdropUrl || undefined,
      progressSeconds,
      durationSeconds,
      episodeId: episodeId || undefined,
      episodeName: episodeName || undefined,
      rating: detail?.rating || undefined,
      genres: detail?.genres || [],
    });

    // Cross-platform sync to database when logged in
    if (userId) {
      const data = { progressSeconds, durationSeconds };
      if (episodeId) {
        saveEpisodeProgress.mutate({ slug, episodeId, data }, {
          onError: () => {},
        });
      } else {
        saveMovieProgress.mutate({ slug, data }, {
          onError: () => {},
        });
      }
    }
  }

  function cancelCountdown() {
    countdownCancelRef.current?.();
    countdownCancelRef.current = null;
    setCountdownSeconds(null);
  }

  function beginNextPlayback() {
    setPlaybackFailure("");
    if (!autoplayEnabled || !nextTarget) return;
    cancelCountdown();
    countdownCancelRef.current = startAutoplayCountdown(
      true,
      10,
      setCountdownSeconds,
      () => {
        try {
          sessionStorage.setItem("ff-autoplay-target", nextTarget.href);
        } catch {}
        navigate(nextTarget.href);
      },
    );
  }

  function updateAutoplay(enabled: boolean) {
    setAutoplayEnabled(enabled);
    try { localStorage.setItem("ff-autoplay", String(enabled)); } catch {}
    if (!enabled) cancelCountdown();
  }

  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      queryClient.removeQueries({
        predicate: query => typeof query.queryKey[0] === "string" &&
          query.queryKey[0].includes("/progress"),
      });
      previousUserIdRef.current = userId;
    }
  }, [queryClient, userId]);

  useEffect(() => () => {
    countdownCancelRef.current?.();
  }, []);

  useEffect(() => {
    cancelCountdown();
    setPlaybackFailure("");
  }, [slug, episodeId]);

  const currentTitleName = detail?.name || playback?.titleName || "Movie";
  const episodeName = episode.data ? `Season ${episode.data.seasonNumber}, Episode ${episode.data.episodeNumber}: ${episode.data.episodeName}` : undefined;
  const isSeries = detail?.kind === "series" || !!episodeId;
  const detailEpisodes = detail?.episodes || [];

  return (
    <Shell>
      <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-12 pt-4 sm:px-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/title/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 transition hover:text-white"
            data-testid="link-back-details"
          >
            <ChevronLeft size={16} />
            Back to details
          </Link>
        </div>

        {isLoading ? (
          <div className="aspect-video w-full max-w-4xl max-h-[65vh] mx-auto rounded-2xl bg-white/[0.04] skeleton" />
        ) : isError ? (
          <div className="empty-state">
            <span className="empty-icon"><LockKeyhole size={20} /></span>
            <h3>Playback is temporarily unavailable</h3>
            <p>This stream could not be loaded at the moment. Please try again shortly.</p>
            <Link href={`/title/${slug}`} className="button-secondary" style={{ marginTop: 16 }}>
              View title details
            </Link>
          </div>
        ) : isSafeUrl && playback ? (
          <div className="mx-auto w-full max-w-4xl">
            <TubiPlayer
              playback={{
                titleName: currentTitleName,
                url: playback.url,
                streamType: playback.streamType,
                posterUrl: playback.posterUrl || detail?.backdropUrl || detail?.posterUrl,
                subtitles: playback.subtitles,
              }}
              titleName={currentTitleName}
              promotedTitle={promotedAdTitle}
              episodeLabel={episodeName}
              initialTime={effectiveInitialTime}
              onTimeUpdate={handleProgressUpdate}
              onEnded={beginNextPlayback}
            />
            <p className="mt-2.5 text-center text-[11px] text-white/40">
              Your title starts after a short ad break. Ads keep FamilyFlix 100% free.
            </p>
          </div>
        ) : (
          <ErrorBox message="Media playback is temporarily unavailable. Please try again later." />
        )}

        {playbackFailure && (
          <p className="form-message error mt-3" role="alert" data-testid="status-playback-error">
            {playbackFailure}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 font-black uppercase tracking-wider text-black shadow-sm">
              FREE STREAM
            </span>
            <span className="rounded border border-white/25 bg-white/5 px-2 py-0.5 font-bold uppercase tracking-wider text-white/80">
              {isSeries ? "Series" : "Movie"}
            </span>
            {detail?.rating && (
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-300">
                ★ {detail.rating}
              </span>
            )}
            <span className="rounded border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-semibold text-purple-300">
              HD · English · [CC]
            </span>
          </div>

          {/* Title Header */}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
              {currentTitleName}
            </h1>
            {episodeName && (
              <p className="mt-1 text-sm font-semibold text-purple-300">{episodeName}</p>
            )}
          </div>

          {/* Metadata Row: Year, Duration, Genres */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-white/60">
            {detail?.year ? <span>{detail.year}</span> : null}
            {detail?.durationMinutes ? (
              <>
                <span>·</span>
                <span>{detail.durationMinutes} min</span>
              </>
            ) : null}
            {detail?.genres && detail.genres.length > 0 ? (
              <>
                <span>·</span>
                <span>{detail.genres.join(", ")}</span>
              </>
            ) : null}
          </div>

          {/* Tagline - Only if NOT identical or duplicate of synopsis */}
          {detail?.tagline &&
            detail.tagline.trim().toLowerCase() !== detail.synopsis?.trim().toLowerCase() &&
            !detail.synopsis?.toLowerCase().includes(detail.tagline.trim().toLowerCase()) && (
            <p className="text-xs sm:text-sm italic text-amber-200/80">
              "{detail.tagline}"
            </p>
          )}

          {/* Synopsis */}
          {detail?.synopsis && (
            <p className="max-w-4xl text-xs sm:text-sm leading-relaxed text-white/70">
              {detail.synopsis}
            </p>
          )}

          {/* Creator Attribution */}
          {detail?.creatorAttribution && (
            <p className="text-xs text-white/45">
              Attribution: <span className="text-white/70">{detail.creatorAttribution}</span>
            </p>
          )}

          {/* Unified Action Toolbar & Autoplay (Tubi Style - Zero Overlap) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSaved}
                aria-pressed={saved}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-xs font-bold text-white transition hover:border-white/50 hover:bg-white/20 active:scale-95"
                data-testid="button-watch-save"
              >
                <Bookmark size={15} />
                <span>{saved ? "In My List" : "Save to My List"}</span>
              </button>
              <LikeDislikeButtons slug={slug} genres={detail?.genres} />
              <button
                type="button"
                onClick={() => setWatchReportModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 text-xs font-bold text-white hover:border-white/50 hover:bg-white/20 active:scale-95"
                title="Report playback problem"
                data-testid="button-watch-report"
              >
                <Flag size={14} />
                <span>Report</span>
              </button>
              <ShareButton name={currentTitleName} />
            </div>

            {/* Autoplay next toggle switch - cleanly aligned */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none" data-testid="control-autoplay">
                <input
                  type="checkbox"
                  checked={autoplayEnabled}
                  onChange={event => updateAutoplay(event.target.checked)}
                  className="size-4 rounded accent-purple-500 cursor-pointer"
                />
                <span className="font-medium">Autoplay next</span>
              </label>
              {countdownSeconds !== null && nextTarget && (
                <div className="flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs text-amber-300" role="status" aria-live="polite" data-testid="status-autoplay-countdown">
                  <span>Next in <strong>{countdownSeconds}s</strong></span>
                  <button className="text-xs underline text-amber-300 hover:text-white ml-1 font-bold" onClick={cancelCountdown} data-testid="button-cancel-autoplay">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <ReportIssueModal slug={slug} titleName={currentTitleName} isOpen={watchReportModalOpen} onClose={() => setWatchReportModalOpen(false)} />

        {isSeries && detailEpisodes.length > 0 && (
          <section className="mt-10" aria-label="Available Episodes">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white sm:text-xl">Episodes</h2>
              <span className="text-xs text-white/50">{detailEpisodes.length} episodes</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detailEpisodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${slug}/${ep.id}`}
                  className={cn(
                    "group flex flex-col justify-between rounded-xl border p-4 transition",
                    episodeId === ep.id
                      ? "border-purple-500 bg-purple-500/10 shadow-lg"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.06]"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-400">
                        S{ep.seasonNumber} · E{ep.episodeNumber}
                      </span>
                      {ep.durationMinutes && (
                        <span className="text-white/40">{ep.durationMinutes} min</span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-white group-hover:text-purple-300">
                      {ep.name}
                    </h3>
                    {ep.synopsis && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/50">{ep.synopsis}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-white/80 group-hover:text-white">
                    <Play size={12} fill="currentColor" /> Watch Episode
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {movies.data && movies.data.length > 0 && (
          <div className="mt-10">
            <TitleRow title="Up Next" subtitle="More free titles you might like">
              {movies.data.filter(m => m.slug !== slug).slice(0, 10).map((item) => (
                <PosterCard key={item.slug} title={item as any} className={posterSize} />
              ))}
            </TitleRow>
          </div>
        )}

        <section className="notice mt-10" data-testid="status-rights-transparency">
          <ShieldCheck size={18} />
          <span><strong>100% Free with ads.</strong> DemureGram and FamilyFlix present catalog titles under reviewed Creative Commons and public domain terms. No subscription or credit card required.</span>
        </section>
      </div>
    </Shell>
  );
}
function MyListPage() {
  const [slugs, setSlugs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("ff-list") || "[]"); } catch { return []; } });
  const catalog = useListPublicTitles({ limit: 100 });
  const saved = catalog.data?.filter(t => slugs.includes(t.slug)) ?? [];
  function remove(slug: string) { const n = slugs.filter(s => s !== slug); setSlugs(n); localStorage.setItem("ff-list", JSON.stringify(n)); }
  return <Shell><Heading eyebrow="Your FamilyFlix" title="My list" description="A private list on this device. Sign in to sync preferences with your DemureGram account." />
    {catalog.isLoading ? <LoadingGrid /> : catalog.isError ? <ErrorBox message={errorText(catalog.error)} retry={() => catalog.refetch()} /> : saved.length ? <><TitleCards titles={saved} /><div style={{ marginTop: 18 }}>{saved.map(t => <button key={t.slug} onClick={() => remove(t.slug)} className="quiet-button" data-testid={`button-remove-saved-${t.id}`}>Remove {t.name}</button>)}</div></> : <Empty title="Your list is ready when you are" icon={<Bookmark size={19} />}>Save a title to keep it close. Your list only includes titles currently present in the approved catalog.</Empty>}
  </Shell>;
}
function AuthPage({ signup = false }: { signup?: boolean }) {
  const [, navigate] = useLocation();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  async function submit(e: FormEvent) { e.preventDefault(); setPending(true); setMessage(""); try {
    const result = signup ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password, rememberMe: true });
    if (result.error) throw new Error(result.error.message || "Account request could not be completed.");
    navigate(signup ? "/onboarding" : "/");
  } catch (e) { setMessage(errorText(e)); } finally { setPending(false); } }
  return <Shell><div className="split" style={{ maxWidth: 900, margin: "25px auto" }}><div className="panel" style={{ padding: 30 }}><Brand /><h1 style={{ font: "800 36px var(--font-display)", letterSpacing: "-.06em", margin: "35px 0 8px" }}>{signup ? "Make room for stories." : "Welcome back."}</h1><p className="helper">Use your DemureGram account to save preferences and your watch list. FamilyFlix is a catalog—not a claim of ownership over the films listed here.</p><div className="notice" style={{ marginTop: 28 }}><ShieldCheck size={17} /><span>Rights details stay visible before playback. Only server-approved streams can play.</span></div></div>
    <form className="panel" onSubmit={submit}><span className="eyebrow">DemureGram account</span><h2 style={{ marginTop: 12 }}>{signup ? "Create your account" : "Sign in"}</h2>{signup && <div className={inputClass}><label htmlFor="auth-name">Name</label><input id="auth-name" required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" data-testid="input-auth-name" /></div>}<div className={inputClass} style={{ marginTop: 15 }}><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" data-testid="input-auth-email" /></div><div className={inputClass} style={{ marginTop: 15 }}><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" required minLength={signup ? 10 : undefined} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} data-testid="input-auth-password" /></div>{message && <p className="form-message error" role="alert" data-testid="status-auth-error">{message}</p>}<button className="button" disabled={pending} style={{ width: "100%", marginTop: 20 }} data-testid="button-auth-submit">{pending ? "Working…" : signup ? "Create account" : "Sign in"}</button><p className="helper" style={{ textAlign: "center", marginTop: 15 }}>{signup ? "Already a member? " : "New to DemureGram? "}<Link href={signup ? "/auth/sign-in" : "/auth/sign-up"} style={{ color: "hsl(19 83% 67%)" }}>{signup ? "Sign in" : "Create an account"}</Link></p>
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid hsl(260 14% 25% / .6)", textAlign: "center" }}>
        <p className="helper" style={{ marginBottom: 12 }}>Want to watch immediately without creating an account? Everything on FamilyFlix is 100% free with ads.</p>
        <Link href="/" className="button-secondary" style={{ width: "100%", justifyContent: "center" }} data-testid="button-continue-guest">
          Continue as Guest
        </Link>
      </div>
    </form></div></Shell>;
}
function OnboardingPage() {
  const qc = useQueryClient(); const q = useGetUserPreferences(); const save = useSaveUserPreferences();
  const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState("");
  const current = q.data;
  useEffect(() => { if (current?.favoriteGenres) setSelected(current.favoriteGenres); }, [current?.favoriteGenres]);
  function toggle(g: string) { setSelected(a => a.includes(g) ? a.filter(x=>x!==g) : a.length < 20 ? [...a,g] : a); }
  function submit() { save.mutate({ data: { favoriteGenres: selected, onboarded: true } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserPreferencesQueryKey() }); setMessage("Your preferences are saved."); }, onError: e => setMessage(errorText(e)) }); }
  return <Shell><Heading eyebrow="A better starting point" title="Choose your kind of story." description="Select genres to help personalize your DemureGram catalog experience. This never changes what is rights-approved." />
    <div className="panel"><div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>{genres.map(g => <button key={g} onClick={() => toggle(g)} className={selected.includes(g) ? "button" : "button-secondary"} data-testid={`button-genre-${g.toLowerCase().replaceAll(" ","-")}`}>{selected.includes(g) && <Check size={13} />}{g}</button>)}</div><div className="form-actions"><button className="button" onClick={submit} disabled={save.isPending} data-testid="button-save-preferences">{save.isPending ? "Saving…" : "Save preferences"}</button><span className="helper">Choose up to 20. {selected.length} selected.</span></div>{message && <p className={`form-message ${message.includes("saved") ? "success" : "error"}`} data-testid="status-preferences">{message}</p>}</div>
    {q.isError && <ErrorBox message={errorText(q.error)} retry={() => q.refetch()} />}
  </Shell>;
}
function CopyrightReportPage() {
  const qc = useQueryClient(); const mutation = useSubmitCopyrightReport(); const [receipt, setReceipt] = useState("");
  const [error, setError] = useState(""); const params = new URLSearchParams(window.location.search);
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(""); const f = new FormData(e.currentTarget);
    mutation.mutate({ data: { titleId: params.get("title") || null, workDescription: String(f.get("workDescription")), infringingUrl: String(f.get("infringingUrl")), rightsHolder: String(f.get("rightsHolder")), reporterName: String(f.get("reporterName")), reporterEmail: String(f.get("reporterEmail")), reporterAddress: String(f.get("reporterAddress")), reporterPhone: String(f.get("reporterPhone")), authorizedAgent: String(f.get("authorizedAgent") || "") || null, goodFaithStatement: true, accuracyStatement: true, signature: String(f.get("signature")) } }, { onSuccess: r => { setReceipt(r.caseNumber); qc.invalidateQueries({ queryKey: getListCopyrightCasesQueryKey() }); }, onError: e => setError(errorText(e)) });
  }
  return <Shell><Heading eyebrow="Copyright & rights" title="Submit a copyright report" description="Use this form only if you are a rights holder or authorized representative. The information below is submitted for review by DemureGram." />
    <div className="notice" style={{ marginBottom: 20 }}><Info size={17} /><span>This form collects the details needed to assess a notice. Legal language on this page is draft for attorney review. We do not publish a mailing address, contact email, or agent identity unless configured.</span></div>
    {receipt ? <div className="panel" data-testid="status-report-receipt"><span className="status good">Received</span><h2 style={{ marginTop: 14 }}>Report received</h2><p>Your case number: <strong className="mono">{receipt}</strong></p><p className="helper">Keep this number for your records. The submission is not a determination of infringement.</p><Link href="/" className="button-secondary">Return to FamilyFlix</Link></div> :
    <form onSubmit={submit} className="panel"><div className="field-grid">
      <div className="field full"><label>Describe the copyrighted work</label><textarea name="workDescription" required minLength={10} maxLength={4000} data-testid="input-report-work" placeholder="Identify the work and explain your rights in it." /></div>
      <div className="field full"><label>Location of the material you are reporting</label><input type="url" name="infringingUrl" required data-testid="input-report-url" /></div>
      <div className="field"><label>Rights holder</label><input name="rightsHolder" required data-testid="input-report-rightsholder" /></div>
      <div className="field"><label>Your name</label><input name="reporterName" required data-testid="input-report-name" /></div>
      <div className="field"><label>Your email</label><input type="email" name="reporterEmail" required data-testid="input-report-email" /></div>
      <div className="field"><label>Phone number</label><input type="tel" name="reporterPhone" required data-testid="input-report-phone" /></div>
      <div className="field full"><label>Mailing address</label><textarea name="reporterAddress" required minLength={5} data-testid="input-report-address" /></div>
      <div className="field"><label>Authorized agent, if applicable</label><input name="authorizedAgent" data-testid="input-report-agent" /></div>
      <div className="field"><label>Electronic signature</label><input name="signature" required data-testid="input-report-signature" /></div>
      <label className="field full helper"><span><input type="checkbox" required data-testid="input-report-good-faith" /> I have a good-faith belief that the use is not authorized by the rights holder, its agent, or the law.</span></label>
      <label className="field full helper"><span><input type="checkbox" required data-testid="input-report-accuracy" /> The information in this report is accurate, and I am authorized to act for the rights holder.</span></label>
    </div>{error && <p className="form-message error" role="alert" data-testid="status-report-error">{error}</p>}<div className="form-actions"><button disabled={mutation.isPending} className="button" data-testid="button-submit-report">{mutation.isPending ? "Submitting…" : "Submit report"}</button><span className="helper">Please submit only truthful, complete information.</span></div></form>}
  </Shell>;
}
function CounterNoticePage({ caseNumber }: { caseNumber: string }) {
  const qc = useQueryClient(); const mutation = useSubmitCounterNotice(); const [receipt, setReceipt] = useState(""); const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); setError("");
    mutation.mutate({ caseNumber, data: { fullName: String(f.get("fullName")), email: String(f.get("email")), address: String(f.get("address")), phone: String(f.get("phone")), removedMaterialUrl: String(f.get("removedMaterialUrl") || ""), reason: String(f.get("reason")), goodFaithStatement: true, jurisdictionConsent: true, accuracyStatement: true, signature: String(f.get("signature")) } }, { onSuccess: r => { setReceipt(r.caseNumber); qc.invalidateQueries({ queryKey: getListCopyrightCasesQueryKey() }); }, onError: e => setError(errorText(e)) });
  }
  return <Shell><Heading eyebrow="Copyright process" title="Submit a counter-notice" description={`For case ${caseNumber}. Provide complete, truthful details. Counter-notice language requires review by your legal counsel.`} />
    <div className="notice" style={{ marginBottom: 18 }}><Info size={17} /><span>Draft for attorney review. Do not submit if you are unsure about the legal consequences. This frontend does not provide legal advice.</span></div>
    {receipt ? <div className="panel" data-testid="status-counter-receipt"><span className="status good">Received</span><h2>Counter-notice received</h2><p>Case number: <strong className="mono">{receipt}</strong></p></div> : <form className="panel" onSubmit={submit}><div className="field-grid">
      {["fullName","email","phone","address","removedMaterialUrl","signature"].map((name,i)=><div className={`field ${name==="address"||name==="removedMaterialUrl"?"full":""}`} key={name}><label>{["Full legal name","Email","Phone","Mailing address","Location of removed material","Electronic signature"][i]}</label>{name==="address"?<textarea name={name} required minLength={5} data-testid={`input-counter-${name}`} />:<input name={name} required type={name==="email"?"email":name==="removedMaterialUrl"?"url":"text"} data-testid={`input-counter-${name}`} />}</div>)}
      <div className="field full"><label>Explain why the material was removed or disabled by mistake</label><textarea name="reason" required minLength={10} maxLength={4000} data-testid="input-counter-reason" /></div>
      {["I have a good-faith belief that the material was removed as a result of mistake or misidentification.","I consent to the jurisdiction stated in the applicable notice process.","The information provided is accurate and I accept the applicable legal process."].map((s,i)=><label className="field full helper" key={i}><span><input required type="checkbox" data-testid={`input-counter-attestation-${i}`} /> {s}</span></label>)}
    </div>{error && <p className="form-message error" role="alert" data-testid="status-counter-error">{error}</p>}<div className="form-actions"><button className="button" disabled={mutation.isPending} data-testid="button-submit-counter">{mutation.isPending?"Submitting…":"Submit counter-notice"}</button></div></form>}
  </Shell>;
}
function PublicInfo({ page }: { page: string }) {
  const config = useGetSiteConfig();
  const text: Record<string,{title:string;desc:string;parts:string[]}> = {
    about: {
      title: "About FamilyFlix By DemureGram — Mission, Leadership & Foundation",
      desc: "From our founding in 2023 to our 2026 rebrand under DemureGram: The history, executive leadership, streaming mission, and future roadmap of FamilyFlix.",
      parts: [
        "COMPANY HERITAGE & THE 2026 REBRAND: FamilyFlix was originally established in 2023 under the founding name Movie Source. In 2026, the company officially rebranded to FamilyFlix and entered an exclusive, visionary partnership with DemureGram, expanding into a next-generation streaming ecosystem and developer platform.",
        "EXECUTIVE LEADERSHIP & FOUNDATION: The company was originally created and guided by founder Princeton T. Taylor. Following his disability in 2026, Princeton T. Taylor formally transferred full ownership, executive command, and intellectual property over to Prisandra T. Taylor. Prisandra T. Taylor now serves as the Founder and CEO over the entire DemureGram Foundation, directing the platform's technological expansion, content curation, and global partnerships with compassion, innovation, and an unwavering commitment to accessibility.",
        "WHAT DEMUREGRAM IS & OUR VISION: DemureGram is an innovative digital media, entertainment, and technology foundation dedicated to building ethical, high-performance, human-first digital platforms. We believe that timeless cinematic culture and modern streaming technology should belong to everyone without prohibitive monthly fees. We are actively building into the future with a rich roadmap of revolutionary entertainment products, AI-assisted media engines, and creator tools to come.",
        "WHAT FAMILYFLIX OFFERS VIEWERS: FamilyFlix provides over 23,270 titles curated across 44 specialized genres and 20 subgenres. Every film and series is verified for legal, commercial public-domain or Creative Commons streaming. We deliver broadcast-quality video streaming, intelligent subtitle delivery, Tubi-style resume timestamps, and dedicated Kids Modes for family safety.",
        "HOW TO SIGN UP & JOIN: Watching FamilyFlix is 100% Free with zero credit card required. Anyone can instantly stream from any web browser, tablet, or smart TV. By creating a free account, viewers can create personalized adult and kid profiles with over 20 custom 3D avatars, sync 'Continue Watching' across all their devices, curate saved Watchlists, and rate titles. For viewers seeking an ad-free experience, an optional VIP Supporter Pass ($4.99/mo) is available to remove video commercials and unlock 4K HDR streams.",
        "DEVELOPER API PLATFORM & SUBSCRIPTIONS: For third-party software developers, entertainment platforms, and cinema researchers, the FamilyFlix Developer Platform By DemureGram offers high-performance REST APIs (/v1/titles, /v1/categories, /v1/streaming, /v1/tts) powered by an isolated API Gateway. We offer three developer tiers: (1) Free Starter Tier — 1,000 monthly API calls with standard metadata access; (2) Developer Pro Tier ($29/mo) — 100,000 monthly API calls, webhook delivery, priority SLA, and media streaming endpoints; and (3) Enterprise Tier ($199/mo) — Unlimited API requests, dedicated endpoints, customized rate limits, custom HLS transcoding, and 24/7 engineering support.",
        "COMPLIANCE & LEGAL NOTICE: All third-party motion pictures, promotional artwork, and trademarks remain the property of their respective creators and rights holders. DemureGram Foundation operates under strict adherence to Title 17, United States Code, and international copyright conventions. Contact our team anytime at support@familyflix.demuregram.com or developers@familyflix.demuregram.com."
      ]
    },
    contact: {
      title: "Contact & Rights Questions",
      desc: "Copyright reporting, licensing inquiries, and catalog questions.",
      parts: [
        "Copyright reports can be submitted through our formal copyright reporting form. Include clear information that enables verification.",
        "If you are a rights holder or authorized representative with questions about any title, stream, poster art, or license attribution, please submit a notice through our verified channels.",
        "Our designated copyright agent and compliance team review all formal notices within 24 business hours."
      ]
    },
    terms: {
      title: "Terms of Use & AVOD Service Guidelines",
      desc: "Platform terms, commercial AVOD guidelines, user profile rules, and streaming usage.",
      parts: [
        "1. Acceptance of Terms: By accessing or using FamilyFlix ('the Service'), operated by DemureGram LLC, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.",
        "2. 100% Free Ad-Supported Streaming (AVOD): FamilyFlix provides free, on-demand streaming of motion pictures and episodic television programs supported by video commercials. No subscription, credit card, or payment is required to access standard catalog playback.",
        "3. Catalog Rights & Public Domain: Content made available on FamilyFlix consists of works in the public domain and works licensed under Creative Commons terms (CC-BY 4.0, CC0 1.0). Each title includes creator attribution and licensing metadata. Users agree not to scrape, redistribute, duplicate, or re-broadcast any content for unauthorized commercial purposes.",
        "4. User Accounts & Multi-Profiles: Registered users may create up to 6 custom profiles (including FamilyFlix Kids profiles). Users are responsible for maintaining account confidentiality and for all activity occurring under their credentials.",
        "5. Optional VIP Subscription: Users may elect to purchase an optional VIP Pass to remove commercial advertisements, unlock uncompressed master audio/video streams, and enable offline device caching. VIP purchases are non-transferable and can be cancelled at any time through Account Settings.",
        "6. Code of Conduct: You agree not to engage in any activity that disrupts or interferes with the Service, servers, or networks connected to FamilyFlix, including circumventing ad-serving mechanisms or tampering with video delivery infrastructure."
      ]
    },
    privacy: {
      title: "Privacy Policy & Cookie Disclosures",
      desc: "Information collection, programmatic ad network disclosures, cookie policies, and California/GDPR rights.",
      parts: [
        "1. Information We Collect: FamilyFlix collects information necessary to deliver and personalize streaming experiences: account details (email, display name), watch history, playback timestamps (for 'Continue Watching' functionality), profile preferences (including Kids Mode flags), and general device telemetry (browser type, operating system, screen resolution).",
        "2. Advertising Partners & Programmatic Networks: FamilyFlix is an AVOD service supported by authorized third-party digital advertising partners, including Google AdSense, Google Ad Manager, Magnite, PubMatic, and Media.net. These partners may use cookies, device identifiers, and similar technologies to serve relevant non-personalized and personalized advertisements in accordance with the IAB Tech Lab standards.",
        "3. Cookies and Tracking Technologies: We use essential cookies (for authentication and session integrity) and advertising cookies (to manage ad frequency, verify viewability, and measure ad engagement). You may manage or opt out of personalized interest-based advertising via the Network Advertising Initiative (NAI) opt-out tool or the Digital Advertising Alliance (DAA) WebChoices tool.",
        "4. Children's Privacy (COPPA): FamilyFlix maintains dedicated Kids Profiles that restrict catalog discovery exclusively to age-appropriate animation and family content. In Kids Mode, we do not collect personal identifiers from children, do not serve targeted behavioral advertising, and adhere strictly to the Children's Online Privacy Protection Act (COPPA).",
        "5. Your Rights (GDPR & CCPA): You have the right to request access to, correction of, or deletion of your personal data at any time through our self-service Account Settings or by contacting privacy@familyflix.demuregram.com. We do not sell your personal information to third parties.",
        "6. Security & Retention: We employ industry-standard encryption (TLS/HTTPS) and database access controls to safeguard your data. Account data is retained only as long as necessary to provide the Service or comply with legal obligations."
      ]
    },
    dmca: {
      title: "Digital Millennium Copyright Act (DMCA) Notice & Policy",
      desc: "Procedures for submitting copyright infringement notices and counter-notifications pursuant to 17 U.S.C. § 512(c).",
      parts: [
        "1. Commitment to Copyright Compliance: FamilyFlix and DemureGram LLC respect the intellectual property rights of creators and rights holders. We comply with the provisions of Title 17, United States Code, Section 512(c) (the Digital Millennium Copyright Act).",
        "2. Notice of Claimed Infringement: If you believe that your copyrighted work has been copied in a way that constitutes infringement and is accessible via FamilyFlix, please submit a written notification containing: (a) A physical or electronic signature of a person authorized to act on behalf of the owner; (b) Identification of the copyrighted work claimed to have been infringed; (c) Identification of the material that is claimed to be infringing, including the specific URL or title slug; (d) Contact information including full name, address, telephone number, and email; (e) A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law; and (f) A statement made under penalty of perjury that the information in the notification is accurate.",
        "3. Counter-Notification Procedure: If you believe that material you submitted was removed or restricted by mistake or misidentification, you may submit a counter-notification containing your name, address, phone number, a statement consenting to the jurisdiction of the federal district court, and a statement under penalty of perjury that the material was removed as a result of mistake or misidentification.",
        "4. Repeat Infringer Policy: Pursuant to 17 U.S.C. § 512(i), DemureGram LLC maintains an enforcement policy that provides for the prompt termination of access for accounts that are confirmed repeat infringers.",
        "5. Designated Copyright Agent: Formal DMCA notices may be submitted via our Copyright Reporting Form at /copyright/report or emailed to dmca@familyflix.demuregram.com."
      ]
    },
    "repeat-infringer-policy": {
      title: "Repeat-Infringer Enforcement Policy",
      desc: "Documented criteria, review standards, and account termination procedures under 17 U.S.C. § 512(i).",
      parts: [
        "DemureGram LLC enforces a documented repeat-infringer policy in compliance with 17 U.S.C. § 512(i).",
        "1. Evidence-Based Review: A third-party complaint is an allegation, not an automatic finding of infringement. Our legal and compliance team independently examines the evidence, license history, and rights records before recording an infringement strike.",
        "2. Counter-Notice Preservation: Counter-notices are reviewed and preserved within the case ledger. While a counter-notice initiates formal statutory timelines, content is not restored without compliance review.",
        "3. Three-Strike Termination Rule: Where multiple independent instances of confirmed infringement are established against an account, DemureGram permanently revokes uploading privileges and terminates user access.",
        "4. Audit & Record Retention: All case evidence, reviewer notes, and communication logs are permanently preserved in our tamper-evident audit history."
      ]
    },
  };
  const pageInfo = text[page] || text.about;
  return <Shell><Heading eyebrow={`DemureGram / ${page}`} title={pageInfo.title} description={pageInfo.desc} />
    <article className="legal-copy">{pageInfo.parts.map((p,i)=><p key={i}>{p}</p>)}{page==="contact" && <><h2>Copyright reporting</h2><p>Use the <Link href="/copyright/report" style={{ color:"hsl(19 83% 67%)" }} data-testid="link-contact-copyright-report">copyright report form</Link> to submit a formal notice. Counter-notices can be submitted using the case-specific link provided in the relevant case communication.</p></>}</article>
    {page==="contact" && (config.data?.copyrightContact ? <div className="panel" style={{marginTop:20}} data-testid="public-copyright-contact"><h2>Copyright contact</h2><p>{config.data.copyrightContact.name}</p><p><a href={`mailto:${config.data.copyrightContact.email}`}>{config.data.copyrightContact.email}</a></p><address style={{fontStyle:"normal",whiteSpace:"pre-wrap"}}>{config.data.copyrightContact.address}</address></div> : <div className="notice" style={{marginTop:20}} data-testid="status-copyright-contact-unconfigured"><Info size={17}/><span>Copyright contact details are configured in the platform registry. Notices sent to dmca@familyflix.demuregram.com or submitted through the report form are processed by our compliance team.</span></div>)}
  </Shell>;
}
function AdminOverview() {
  return (
    <Shell admin>
      <div>
        <Heading
          eyebrow="Studio / Analytics & Operations"
          title="Catalog & Streaming Intelligence"
          description="Real-time concurrent streamers, AVOD commercial metrics, trending titles, and rights clearance readiness."
        />
        <AdminAnalyticsDashboard />
      </div>
    </Shell>
  );
}
function AdminLibrary() {
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { role?: string } } | null | undefined;
  const isAdmin = session?.user?.role === "admin";
  const [query,setQuery] = useState("");
  const params = useMemo(()=>({query:query.trim()||undefined}),[query]);
  const q = useListAdminTitles(params);
  return <Shell admin><div><Heading eyebrow="Studio / catalog" title="Library & rights" description={isAdmin?"Review every title, its publication state, stream readiness and rights evidence.":"Read-only catalog overview. Copyright and rights decisions are restricted to administrators."} action={isAdmin?<Link className="button" href="/admin/library/new" data-testid="link-create-title">Add title <ArrowRight size={15}/></Link>:undefined} />
    <input className="search-box" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a title…" style={{ maxWidth: 420, marginBottom: 18 }} data-testid="input-admin-title-search" />
     {q.isLoading?<div className="skeleton" style={{height:260}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:q.data?.length?<div className="panel table-wrap"><table className="data-table"><thead><tr><th>Title</th><th>State</th><th>Stream</th><th>Rights records</th><th></th></tr></thead><tbody>{q.data.map(t=><tr key={t.id} data-testid={`row-admin-title-${t.id}`}><td><strong>{t.name}</strong><div className="helper">{t.kind} · {t.slug}</div></td><td><span className={`status ${t.status==="published"?"good":"warn"}`} data-testid={`status-title-state-${t.id}`}>{t.status}</span></td><td><span className={`status ${t.streamStatus==="ready"?"good":"warn"}`} data-testid={`status-stream-${t.id}`}>{t.streamStatus}</span></td><td>{t.rights?.length ?? 0}</td><td>{isAdmin?<Link href={`/admin/library/${t.id}`} className="button-secondary" data-testid={`link-edit-title-${t.id}`}>Review <ArrowRight size={13}/></Link>:<span className="helper">Admin review only</span>}</td></tr>)}</tbody></table></div>:<Empty title="No titles to review" icon={<FileCheck2 size={20}/>}>Create an admin title only when you have its rights evidence. A draft is not automatically approved for public listing.</Empty>}
  </div></Shell>;
}
function AdminTitleCreate() {
  const qc=useQueryClient(); const create=useCreateAdminTitle(); const [message,setMessage]=useState(""); const [,navigate]=useLocation();
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const rights:RightsInput[]=[{assetKind:"main-video",assetLabel:String(f.get("assetLabel")||"Main video"),assetUrl:String(f.get("assetUrl")),rightsHolder:String(f.get("rightsHolder")),creatorAttribution:String(f.get("creatorAttribution")),licenseType:String(f.get("licenseType")) as RightsInput["licenseType"],licenseVersion:String(f.get("licenseVersion")),licenseUrl:String(f.get("licenseUrl")),usageRestrictions:String(f.get("restrictions")||"").split(";").map(x=>x.trim()).filter(Boolean),sourceUrl:String(f.get("sourceUrl")),evidenceUrl:String(f.get("evidenceUrl")),evidenceNotes:String(f.get("evidenceNotes")||"")||null,territory:String(f.get("territory")||"")||null,expiresAt:isoDateTime(f.get("expiresAt")),uploaderAttested:true}];
     create.mutate({data:{name:String(f.get("name")),kind:String(f.get("kind")) as TitleKind,synopsis:String(f.get("synopsis")),year:f.get("year")?Number(f.get("year")):null,tagline:String(f.get("tagline")||"")||null,creatorAttribution:String(f.get("creatorAttribution")),rating:String(f.get("rating")||"")||null,durationMinutes:f.get("duration")?Number(f.get("duration")):null,genres:String(f.get("genres")||"").split(",").map(x=>x.trim()).filter(Boolean),cast:String(f.get("cast")||"").split(",").map(x=>x.trim()).filter(Boolean),featured:f.get("featured")==="on",rights,uploaderAttested:true}}, {onSuccess:t=>{qc.invalidateQueries({queryKey:getListAdminTitlesQueryKey()});setMessage("Draft created. Rights review is still required before publication.");navigate(`/admin/library/${t.id}`);},onError:e=>setMessage(errorText(e))});
  }
  return <Shell admin><div><Heading eyebrow="Studio / new entry" title="Add a catalog title" description="Create exactly one main-video rights record with each title. New entries remain subject to a separate review." />
    <form className="panel" onSubmit={submit}><h2>Title details</h2><div className="field-grid">
      <div className="field"><label>Title name</label><input name="name" required maxLength={240} data-testid="input-title-name"/></div><div className="field"><label>Kind</label><select name="kind" defaultValue="movie" data-testid="input-title-kind"><option value="movie">Movie</option><option value="series">Series</option><option value="live">Live</option></select></div>
      <div className="field full"><label>Synopsis</label><textarea name="synopsis" required maxLength={10000} data-testid="input-title-synopsis"/></div>
      <div className="field"><label>Creator attribution</label><input name="creatorAttribution" required data-testid="input-title-creator"/></div><div className="field"><label>Year</label><input name="year" type="number" min="1880" max="2100" data-testid="input-title-year"/></div>
      <div className="field"><label>Genres, comma separated</label><input name="genres" data-testid="input-title-genres"/></div><div className="field"><label>Cast, comma separated</label><input name="cast" data-testid="input-title-cast"/></div>
      <div className="field"><label>Tagline</label><input name="tagline" data-testid="input-title-tagline"/></div><div className="field"><label>Audience rating</label><input name="rating" data-testid="input-title-rating"/></div>
       <div className="field"><label>Duration in minutes</label><input name="duration" type="number" min="1" data-testid="input-title-duration"/></div><label className="helper"><input name="featured" type="checkbox" data-testid="input-title-featured"/> Feature on home</label>
    </div>
    <h2 style={{marginTop:28}}>Rights evidence</h2><p className="helper">Do not use torrent or magnet links as playback or source media. Provide rights documentation and license details from the relevant rights holder. For a series, this record covers the overall series listing; each episode must be imported with its own rights evidence and playback source.</p>
    <div className="field-grid" style={{marginTop:14}}>
      <div className="field"><label>Asset label</label><input name="assetLabel" required defaultValue="Main video" data-testid="input-rights-label"/></div><div className="field"><label>Main asset URL</label><input type="url" name="assetUrl" required data-testid="input-rights-asset-url"/></div>
      <div className="field"><label>Rights holder</label><input name="rightsHolder" required data-testid="input-rights-holder"/></div><div className="field"><label>Creator attribution</label><input name="creatorAttribution" required data-testid="input-rights-creator"/></div>
      <div className="field"><label>License type</label><select name="licenseType" defaultValue="" required data-testid="input-rights-license"><option value="" disabled>Select rights status</option>{Object.values(LicenseType).map(l=><option key={l} value={l}>{l}</option>)}</select></div><div className="field"><label>Exact license / version</label><input name="licenseVersion" required data-testid="input-rights-version" placeholder="Exact name and version"/></div>
      <div className="field"><label>Exact license URL</label><input name="licenseUrl" type="url" required data-testid="input-rights-license-url"/></div><div className="field"><label>Source URL</label><input name="sourceUrl" type="url" required data-testid="input-rights-source"/></div>
      <div className="field"><label>Evidence URL</label><input name="evidenceUrl" type="url" required data-testid="input-rights-evidence"/></div><div className="field"><label>Territory</label><input name="territory" data-testid="input-rights-territory"/></div>
      <div className="field"><label>Expires at</label><input name="expiresAt" type="datetime-local" data-testid="input-rights-expiry"/></div><div className="field"><label>Restrictions (separate with semicolons)</label><input name="restrictions" data-testid="input-rights-restrictions"/></div>
       <div className="field full"><label>Evidence notes</label><textarea name="evidenceNotes" required minLength={10} data-testid="input-rights-notes" placeholder="Explain what this source shows about the rights claim."/></div>
      <label className="field full helper"><span><input required type="checkbox" data-testid="input-rights-attest"/> I attest that the submitted material and evidence are accurate and that I am authorized to submit them for review.</span></label>
    </div>{message&&<p className="form-message error" data-testid="status-create-title">{message}</p>}<div className="form-actions"><button className="button" disabled={create.isPending} data-testid="button-create-title">{create.isPending?"Creating…":"Create draft for review"}</button><Link href="/admin/library" className="button-secondary">Cancel</Link></div></form>
  </div></Shell>;
}
function AdminTitleDetail({id}:{id:string}) {
  const qc=useQueryClient(); const q=useGetAdminTitle(id,{query:{enabled:!!id,queryKey:getGetAdminTitleQueryKey(id)}});
  const archiveSources=useGetAdminArchiveSources(id,{query:{enabled:!!id,queryKey:getGetAdminArchiveSourcesQueryKey(id)}});
  const assets=useListTitleRightsAssets(id,{query:{enabled:!!id,queryKey:getListTitleRightsAssetsQueryKey(id)}});
  const subtitles=useListTitleSubtitles(id,{query:{enabled:!!id,queryKey:getListTitleSubtitlesQueryKey(id)}});
  const addAsset=useAddTitleRightsAsset(); const review=useReviewTitleRights(); const publish=usePublishAdminTitle(); const update=useUpdateAdminTitle(); const remove=useDeleteAdminTitle();
  const setStream=useSetTitleStream(); const upload=useCreateCloudflareUpload(); const sync=useSyncCloudflareStream(); const addSub=useAddTitleSubtitle(); const delSub=useDeleteTitleSubtitle();
  const [message,setMessage]=useState("");
  const [uploadFile,setUploadFile]=useState<File|null>(null);
  const [uploadProgress,setUploadProgress]=useState<number|null>(null);
  const [uploadAssetId,setUploadAssetId]=useState("");
  if(q.isLoading) return <Shell admin><div className="skeleton" style={{height:340}}/></Shell>;
  if(q.isError||!q.data) return <Shell admin><div><Heading eyebrow="Studio / library" title="Title record"/><ErrorBox message={q.isError?errorText(q.error):"Title record not found."} retry={()=>q.refetch()}/></div></Shell>;
  const t=q.data;
   function refresh(){qc.invalidateQueries({queryKey:getGetAdminTitleQueryKey(id)});qc.invalidateQueries({queryKey:getListAdminTitlesQueryKey()});qc.invalidateQueries({queryKey:getListTitleRightsAssetsQueryKey(id)});qc.invalidateQueries({queryKey:getListTitleSubtitlesQueryKey(id)});qc.invalidateQueries({queryKey:getListPublicTitlesQueryKey()});qc.invalidateQueries({queryKey:getGetPublicTitleQueryKey(t.slug)});}
  const hasMainVideoRights=!!assets.data?.some(r=>r.assetKind==="main-video");
  function assetSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const data:RightsInput={assetKind:String(f.get("assetKind")) as RightsInput["assetKind"],assetLabel:String(f.get("assetLabel")),assetUrl:String(f.get("assetUrl")),rightsHolder:String(f.get("rightsHolder")),creatorAttribution:String(f.get("creatorAttribution")),licenseType:String(f.get("licenseType")) as RightsInput["licenseType"],licenseVersion:String(f.get("licenseVersion")),licenseUrl:String(f.get("licenseUrl")),usageRestrictions:String(f.get("restrictions")||"").split(";").map(x=>x.trim()).filter(Boolean),sourceUrl:String(f.get("sourceUrl")),evidenceUrl:String(f.get("evidenceUrl")),evidenceNotes:String(f.get("evidenceNotes")||"")||null,territory:String(f.get("territory")||"")||null,expiresAt:isoDateTime(f.get("expiresAt")),uploaderAttested:true};if(data.assetKind==="main-video"&&hasMainVideoRights){setMessage("Exactly one main-video rights record is allowed. This title already has one.");return;}addAsset.mutate({id,data},{onSuccess:()=>{refresh();setMessage("Rights evidence added for review.");},onError:e=>setMessage(errorText(e))});}
  function reviewSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const rightsIds=f.getAll("rightsIds").map(String);if(!rightsIds.length){setMessage("Select at least one rights record to review.");return;}review.mutate({id,data:{decision:String(f.get("decision")) as ReviewDecisionDecision,note:String(f.get("note")),rightsIds}},{onSuccess:()=>{refresh();setMessage("Review decision recorded.");},onError:e=>setMessage(errorText(e))});}
  function streamSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const url=String(f.get("url")||"");let parsed:URL;try{parsed=new URL(url);}catch{setMessage("Enter one direct HTTPS .mp4 or .m3u8 URL.");return;}if(parsed.protocol!=="https:"||!/\.(?:mp4|m3u8)$/i.test(parsed.pathname)){setMessage("Enter exactly one HTTPS direct-video URL ending in .mp4 or .m3u8. Torrent, magnet and non-video links are not accepted.");return;}const streamUrl=/\.m3u8$/i.test(parsed.pathname)?{hlsUrl:url}:{mp4Url:url};setStream.mutate({id,data:{provider:"manual",...streamUrl,signedPlayback:false}},{onSuccess:()=>{refresh();setMessage("Stream source saved. Availability still depends on approval and server checks.");},onError:e=>setMessage(errorText(e))});}
   function requestUpload(){if(!uploadFile){setMessage("Choose a local MP4 or MOV file before requesting a Cloudflare upload.");return;}if(!/\.(mp4|mov)$/i.test(uploadFile.name)||uploadFile.size===0){setMessage("Choose a non-empty local .mp4 or .mov video file.");return;}if(uploadFile.size>MAX_UPLOAD_BYTES){setMessage("Choose a video file smaller than 30 GB.");return;}setUploadProgress(0);setMessage("Requesting a secure Cloudflare upload destination…");upload.mutate({id},{onSuccess:direct=>{setUploadAssetId(direct.assetId);refresh();const transfer=new TusUpload(uploadFile,{endpoint:direct.uploadUrl,retryDelays:[0,3000,5000,10000,20000],chunkSize:50*1024*1024,metadata:{filename:uploadFile.name,filetype:uploadFile.type||"video/mp4"},onProgress:(sent,total)=>setUploadProgress(total>0?Math.floor(sent/total*100):0),onError:error=>{setUploadProgress(null);setMessage(`Upload failed: ${error.message}`);},onSuccess:()=>{setUploadProgress(100);setMessage(`Upload transfer completed. Cloudflare asset ID: ${direct.assetId}. Use Sync to refresh processing status.`);}});transfer.start();},onError:e=>{setUploadProgress(null);setMessage(errorText(e));}});}
  const mainVideoCount=t.rights?.filter(r=>r.assetKind==="main-video").length??0;
  const activeTorrent=archiveSources.data?.some(source=>source.torrents.some(torrent=>torrent.rightsStatus==="approved"&&torrent.playbackStatus==="active"))??false;
  const publishReady=mainVideoCount===1&&!!t.rights?.length&&t.rights.every(r=>r.reviewStatus==="approved")&&(t.kind==="series"||t.streamStatus==="ready"||activeTorrent);
  return <Shell admin><div><Heading eyebrow="Studio / rights record" title={t.name} description={`/${t.slug} · ${t.kind}`} action={<div className="form-actions" style={{marginTop:0}}><button className="button" disabled={!publishReady||publish.isPending} onClick={()=>publish.mutate({id},{onSuccess:()=>{refresh();setMessage("Title published to the approved catalog.");},onError:e=>setMessage(errorText(e))})} data-testid="button-publish-title">{publish.isPending?"Publishing…":"Publish to catalog"}</button><button className="button-danger" onClick={()=>{if(confirm("Archive this title?"))remove.mutate({id},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListAdminTitlesQueryKey()});setMessage("Title archived.");},onError:e=>setMessage(errorText(e))});}} data-testid="button-archive-title">Archive title</button></div>}/>
      {t.slug.startsWith("yts-")&&t.status==="draft"&&<div className="notice" style={{marginTop:18}} data-testid="status-metadata-only-draft"><ShieldCheck size={18}/><span><strong>Unlicensed metadata draft.</strong> Archive metadata and source references do not establish rights. Every imported torrent starts private, unverified, and disabled; it requires separate evidence review and activation before playback. Add independently verified title rights before publication.</span></div>}
      <ArchiveSourcePanel id={id}/>
     {mainVideoCount!==1&&<p className="form-message error" role="status">Exactly one main-video rights record is required before publication. Current count: {mainVideoCount}.</p>}
    <div className="metric-grid"><div className="metric"><span>Publication state</span><strong style={{fontSize:17}}>{t.status}</strong></div><div className="metric"><span>Stream</span><strong style={{fontSize:17}}>{t.streamStatus}</strong></div><div className="metric"><span>Rights records</span><strong>{t.rights?.length??0}</strong></div><div className="metric"><span>Created</span><strong style={{fontSize:17}}>{stamp(t.createdAt)}</strong></div></div>
    <form className="panel" style={{marginTop:18}} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);update.mutate({id,data:{name:String(f.get("name")),synopsis:String(f.get("synopsis"))}},{onSuccess:()=>{refresh();setMessage("Title metadata saved.");},onError:e=>setMessage(errorText(e))});}}><h2>Title metadata</h2><div className="field-grid"><div className="field"><label>Name</label><input name="name" required defaultValue={t.name} data-testid="input-edit-title-name"/></div><div className="field full"><label>Synopsis</label><textarea name="synopsis" defaultValue={t.synopsis} data-testid="input-edit-title-synopsis"/></div></div><div className="form-actions"><button className="button-secondary" disabled={update.isPending} data-testid="button-update-title">{update.isPending?"Saving…":"Save title details"}</button></div></form>
    {t.kind==="series"&&<SeriesEpisodeManager id={id} slug={t.slug} seriesPublished={t.status==="published"}/>}
    {message&&<p className="form-message success" data-testid="status-admin-title">{message}</p>}
    <div className="panel" style={{marginTop:18}}><h2>Rights records & evidence</h2>{assets.isLoading?<div className="skeleton" style={{height:110}}/>:assets.isError?<ErrorBox message={errorText(assets.error)} retry={()=>assets.refetch()}/>:assets.data?.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Asset</th><th>Holder / license</th><th>Review</th><th>Evidence</th></tr></thead><tbody>{assets.data.map(r=><tr key={r.id} data-testid={`row-rights-evidence-${r.id}`}><td>{r.assetLabel}<div className="helper">{r.assetKind}</div></td><td>{r.rightsHolder}<div className="helper">{r.licenseType} {r.licenseVersion}</div></td><td><span className={`status ${r.reviewStatus==="approved"?"good":r.reviewStatus==="pending"?"warn":""}`} data-testid={`status-rights-${r.id}`}>{r.reviewStatus}</span></td><td><details><summary className="helper" style={{cursor:"pointer"}}>Evidence details</summary><div className="helper wrap" style={{minWidth:230,paddingTop:8}}><p>Creator: {r.creatorAttribution}</p><p>Asset URL: {r.assetUrl||"Not supplied"}</p><p>License URL: {r.licenseUrl||"Not supplied"}</p><p>Source: {r.sourceUrl||"Not supplied"}</p><p>Evidence: {r.evidenceUrl||"Not supplied"}</p><p>Restrictions: {r.usageRestrictions?.join("; ")||"None listed"}</p><p>Territory: {r.territory||"Not specified"} · Expires: {stamp(r.expiresAt)}</p><p>Uploader attestation: {r.uploaderAttested?"Provided":"Not recorded"}</p><p>Submitted: {stamp(r.submittedAt)} · Reviewer: {r.reviewedBy||"Not reviewed"}</p>{r.reviewNotes&&<p>Reviewer notes: {r.reviewNotes}</p>}{r.evidenceNotes&&<p>Evidence notes: {r.evidenceNotes}</p>}</div></details></td></tr>)}</tbody></table></div>:<Empty title="No evidence records">Add source, license and supporting evidence before approving publication.</Empty>}</div>
    <div className="split" style={{marginTop:16}}><form className="panel" onSubmit={assetSubmit}><h2>Add rights evidence</h2><div className="field-grid">
       <div className="field"><label>Asset kind</label><select name="assetKind" defaultValue="other" data-testid="input-asset-kind">{Object.values(AssetKind).filter(a=>a!=="main-video"||!hasMainVideoRights).map(a=><option value={a} key={a}>{a}</option>)}</select></div><div className="field"><label>Label</label><input name="assetLabel" required data-testid="input-asset-label"/></div><div className="field"><label>Rights holder</label><input name="rightsHolder" required data-testid="input-asset-holder"/></div><div className="field"><label>Creator attribution</label><input name="creatorAttribution" required data-testid="input-asset-creator"/></div><div className="field"><label>License type</label><select name="licenseType" defaultValue="" required><option value="" disabled>Select rights status</option>{Object.values(LicenseType).map(a=><option key={a}>{a}</option>)}</select></div><div className="field"><label>Exact license / version</label><input name="licenseVersion" required data-testid="input-asset-license-version"/></div><div className="field"><label>Exact license URL</label><input name="licenseUrl" type="url" required/></div><div className="field"><label>Asset URL</label><input name="assetUrl" type="url" required/></div><div className="field"><label>Source URL</label><input name="sourceUrl" type="url" required/></div><div className="field"><label>Evidence URL</label><input name="evidenceUrl" type="url" required/></div><div className="field"><label>Territory</label><input name="territory"/></div><div className="field"><label>Expires at</label><input type="datetime-local" name="expiresAt" data-testid="input-asset-expiry"/></div><div className="field"><label>Restrictions, semicolon separated</label><input name="restrictions"/></div><div className="field full"><label>Evidence notes</label><textarea name="evidenceNotes" required minLength={10} placeholder="Explain what this source shows about the rights claim."/></div><label className="field full helper"><span><input required type="checkbox" data-testid="input-asset-attest"/> I attest this evidence is accurate and authorized.</span></label>
    </div><div className="form-actions"><button className="button" disabled={addAsset.isPending} data-testid="button-add-rights-asset">Add evidence</button></div></form>
    <form className="panel" onSubmit={reviewSubmit}><h2>Review rights</h2><p className="helper">Select the evidence records covered by the decision. An explicit reviewer note is required.</p><div className="field" style={{marginBottom:12}}><label>Rights records to review</label>{assets.data?.length?assets.data.map(r=><label key={r.id} className="helper" style={{display:"block",padding:"5px 0"}}><input name="rightsIds" type="checkbox" value={r.id} data-testid={`input-review-rights-${r.id}`}/> {r.assetLabel} · {r.rightsHolder} · {r.reviewStatus}</label>):<span className="helper">Add at least one rights record before review.</span>}</div><div className="field"><label>Decision</label><select name="decision" data-testid="input-review-decision"><option value="approve">Approve</option><option value="restrict">Restrict</option><option value="reject">Reject</option><option value="restore">Restore</option></select></div><div className="field" style={{marginTop:12}}><label>Reviewer notes</label><textarea name="note" required minLength={1} maxLength={4000} data-testid="input-review-note"/></div><div className="form-actions"><button className="button" disabled={review.isPending||!assets.data?.length} data-testid="button-review-rights">Record review</button></div></form></div>
     <div className="split" style={{marginTop:16}}><form className="panel" onSubmit={streamSubmit}><h2>Attach a media source</h2><p className="helper">A source is not playable just because it is attached. The main-video evidence must cover the same work, and an administrator must review it before publication.</p><p className="helper">Enter exactly one direct HTTPS .mp4 or .m3u8 URL. It must point to the video file or HLS manifest itself; torrent, magnet, embed and webpage URLs are not accepted.</p><p className="helper">Exactly one main-video rights record is required for the title. Do not add a second main-video record.</p><div className="field"><label>Direct MP4 / HLS URL</label><input type="url" name="url" required placeholder="https://media.example/title.mp4" data-testid="input-stream-url"/></div><div className="form-actions"><button className="button" disabled={setStream.isPending} data-testid="button-set-stream">Save stream</button></div><div className="field" style={{marginTop:16}}><label htmlFor="cloudflare-local-file">Local video file for Cloudflare Stream</label><input id="cloudflare-local-file" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={e=>{setUploadFile(e.currentTarget.files?.[0]||null);setUploadProgress(null);setUploadAssetId("");setMessage("");}} data-testid="input-cloudflare-file"/><span className="helper">Choose one .mp4 or .mov file smaller than 30 GB. The browser uploads it directly to a temporary Cloudflare destination.</span></div><div className="form-actions"><button type="button" className="button-secondary" disabled={upload.isPending||uploadProgress!==null||!uploadFile} onClick={requestUpload} data-testid="button-cloudflare-upload">{upload.isPending?"Preparing upload…":uploadProgress!==null&&uploadProgress<100?"Uploading…":uploadProgress===100?"Transfer complete":"Upload selected file"}</button><button type="button" className="button-secondary" disabled={sync.isPending||t.stream?.provider!=="cloudflare"||(uploadProgress!==100&&!["pending","processing","error","disabled"].includes(t.streamStatus))} onClick={()=>sync.mutate({id},{onSuccess:()=>{refresh();setMessage("Stream processing status refreshed.");},onError:e=>setMessage(errorText(e))})} data-testid="button-sync-stream">{sync.isPending?"Syncing…":"Sync processing status"}</button></div>{uploadProgress!==null&&<div className="upload-progress" role="status" aria-live="polite"><div className="helper">{uploadProgress===100?"Transfer complete — use Sync to check processing.":`Uploading to Cloudflare · ${uploadProgress}%`}</div><progress max="100" value={uploadProgress} aria-label="Cloudflare upload progress"/>{uploadAssetId&&<div className="helper mono">Asset ID · {uploadAssetId}</div>}</div>}{message&&<p className={`form-message ${message.includes("failed")||message.includes("Enter")||message.includes("Choose")?"error":"success"}`} role="status" data-testid="status-stream-message">{message}</p>}</form>
     <div className="panel"><h2>Subtitles</h2>{subtitles.data?.map(s=><div className="rights-row" key={s.id}><div><strong>{s.label}</strong><p>{s.language} · rights holder {s.rights?.rightsHolder || "Not specified"}</p>{!s.rights&&<span className="status warn">Legacy track — rights evidence missing</span>}</div><button className="quiet-button" onClick={()=>delSub.mutate({id,subtitleId:s.id},{onSuccess:refresh,onError:e=>setMessage(errorText(e))})} data-testid={`button-delete-subtitle-${s.id}`}>Remove</button></div>)}<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const rights={assetKind:"subtitle" as const,assetLabel:String(f.get("label")),assetUrl:String(f.get("url")),rightsHolder:String(f.get("holder")),creatorAttribution:String(f.get("creator")),licenseType:String(f.get("licenseType")) as RightsInput["licenseType"],licenseVersion:String(f.get("licenseVersion")),licenseUrl:String(f.get("licenseUrl")),usageRestrictions:String(f.get("restrictions")||"").split(";").map(x=>x.trim()).filter(Boolean),sourceUrl:String(f.get("source")),evidenceUrl:String(f.get("evidence")),evidenceNotes:String(f.get("evidenceNotes")||"")||null,territory:String(f.get("territory")||"")||null,expiresAt:isoDateTime(f.get("expiresAt")),uploaderAttested:true as const};addSub.mutate({id,data:{language:String(f.get("language")),label:String(f.get("label")),url:String(f.get("url")),rights,uploaderAttested:true}},{onSuccess:()=>{refresh();setMessage("Subtitle added.");},onError:e=>setMessage(errorText(e))});}}><div className="field-grid"><div className="field"><label>Language code</label><input name="language" required data-testid="input-subtitle-language"/></div><div className="field"><label>Label</label><input name="label" required data-testid="input-subtitle-label"/></div><div className="field"><label>Subtitle URL</label><input type="url" name="url" required data-testid="input-subtitle-url"/></div><div className="field"><label>Rights holder</label><input name="holder" required data-testid="input-subtitle-holder"/></div><div className="field"><label>Creator attribution</label><input name="creator" required defaultValue={t.name} data-testid="input-subtitle-creator"/></div><div className="field"><label>License type</label><select name="licenseType" defaultValue="" required><option value="" disabled>Select rights status</option>{Object.values(LicenseType).map(a=><option key={a}>{a}</option>)}</select></div><div className="field"><label>License version</label><input name="licenseVersion" required data-testid="input-subtitle-license-version"/></div><div className="field"><label>Exact license URL</label><input name="licenseUrl" type="url" required data-testid="input-subtitle-license-url"/></div><div className="field"><label>Source URL</label><input type="url" name="source" required data-testid="input-subtitle-source"/></div><div className="field"><label>Evidence URL</label><input type="url" name="evidence" required data-testid="input-subtitle-evidence"/></div><div className="field"><label>Territory</label><input name="territory" data-testid="input-subtitle-territory"/></div><div className="field"><label>Expires at</label><input type="datetime-local" name="expiresAt" data-testid="input-subtitle-expiry"/></div><div className="field full"><label>Evidence notes</label><textarea name="evidenceNotes" required minLength={1} data-testid="input-subtitle-evidence-notes"/></div><div className="field"><label>Restrictions separated with semicolons</label><input name="restrictions" data-testid="input-subtitle-restrictions"/></div></div><button className="button" style={{marginTop:12}} data-testid="button-add-subtitle">Add subtitle with rights</button></form></div></div>
  </div></Shell>;
}
function AdminImport() {
  const qc = useQueryClient();
  const mutation = useImportTitles();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [dryRun, setDryRun] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [attest, setAttest] = useState(false);
  const [report, setReport] = useState<import("@workspace/api-client-react").ImportReport | null>(null);
  const [message, setMessage] = useState("");
  const [curatedLoading, setCuratedLoading] = useState(false);
  const csvHeader = "name,kind,synopsis,year,creatorAttribution,assetLabel,assetUrl,rightsHolder,rightsCreatorAttribution,licenseType,licenseVersion,licenseUrl,usageRestrictions,sourceUrl,evidenceUrl,evidenceNotes,territory,expiresAt,mp4Url,hlsUrl";
  function download() {
    const blob = new Blob([format === "csv" ? csvHeader + "\n" : "[]"], { type: format === "csv" ? "text/csv" : "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `familyflix-template.${format}`;
    a.click();
    URL.revokeObjectURL(u);
  }
  async function loadCurated() {
    setMessage("");
    setCuratedLoading(true);
    try {
      const records = await getCuratedPublicDomainTitles();
      setText(JSON.stringify(records, null, 2));
      setFormat("json");
      setDryRun(true);
      setUpdateExisting(false);
      setAttest(false);
      setReport(null);
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setCuratedLoading(false);
    }
  }
  function run() {
    setMessage("");
    mutation.mutate(
      { data: { format: format as ImportInputFormat, payload: text, dryRun, updateExisting, uploaderAttested: true } },
      {
        onSuccess: (r) => {
          setReport(r);
          if (!dryRun) qc.invalidateQueries({ queryKey: getListAdminTitlesQueryKey() });
        },
        onError: (e) => setMessage(errorText(e)),
      },
    );
  }
  const archiveCsvTabContent = (
    <>
      <div className="notice">
        <ShieldCheck size={17} className="shrink-0 text-[#00D2FF]" />
        <span>Start with a dry run. Imported records remain subject to separate rights approval. A torrent or magnet reference is never a playable source or proof of rights.</span>
      </div>
      <ArchiveImportPanel />
      <div className="panel space-y-5">
        <div>
          <h2>CSV &amp; Curated JSON Importer</h2>
          <p className="helper">Import structured CSV spreadsheets or curated Library of Congress records into draft review.</p>
        </div>
        <div className="notice">
          <Info size={17} className="shrink-0 text-[#00D2FF]" />
          <span>The three NASA candidates remain withheld because their creator/employment basis and complete audiovisual contents have not been verified. The LOC films below have item-specific records stating that their collection is public domain and free to reuse; they still require administrator rights review and explicit publication.</span>
        </div>
        <div className="helper">
          Source records:{" "}
          {curatedPublicDomainTitles.map((title, index) => (
            <span key={title.sourceUrl}>
              {index > 0 ? " · " : ""}
              <a href={title.sourceUrl} target="_blank" rel="noreferrer" className="text-[#00D2FF] hover:underline">
                {title.name} ({title.year})
              </a>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button className="button-secondary" disabled={curatedLoading} onClick={() => void loadCurated()} data-testid="button-load-curated-public-domain">
            {curatedLoading ? "Loading source records…" : `Load LOC films (${curatedPublicDomainTitles.length})`}
          </button>
          <button className={format === "csv" ? "button" : "button-secondary"} onClick={() => setFormat("csv")} data-testid="button-format-csv">CSV</button>
          <button className={format === "json" ? "button" : "button-secondary"} onClick={() => setFormat("json")} data-testid="button-format-json">JSON</button>
          <button className="button-secondary" onClick={download} data-testid="button-download-template">Download blank template</button>
          <label className="button-secondary inline-flex cursor-pointer items-center">
            Load file
            <input
              type="file"
              accept=".csv,.json,application/json,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormat(file.name.endsWith(".json") ? "json" : "csv");
                  file.text().then(setText);
                  setReport(null);
                }
              }}
              data-testid="input-import-file"
            />
          </label>
        </div>
        <div className="field">
          <label>Import payload</label>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setReport(null);
            }}
            spellCheck={false}
            placeholder={format === "csv" ? csvHeader + "\n" : "[]"}
            className="font-mono text-[12.5px]"
            data-testid="input-import-payload"
          />
        </div>
        <div className="field-grid">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3.5 py-2.5 text-[13.5px] text-slate-200">
            <input type="checkbox" checked={dryRun} onChange={(e) => { setDryRun(e.target.checked); setReport(null); }} className="size-4 accent-[#FF3B5C]" data-testid="input-import-dryrun" />
            <span>Validate only (dry run)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3.5 py-2.5 text-[13.5px] text-slate-200">
            <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} className="size-4 accent-[#FF3B5C]" data-testid="input-import-update" />
            <span>Update matching titles</span>
          </label>
        </div>
        {!dryRun && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13.5px] text-amber-200">
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 size-4 accent-[#FF3B5C]" data-testid="input-import-attest" />
            <span>I confirm I am authorized to submit these titles and all associated rights evidence.</span>
          </label>
        )}
        {message && <p className="form-message error" role="alert" data-testid="status-import-error">{message}</p>}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-4">
          <button className="button" disabled={mutation.isPending || !text.trim() || (!dryRun && !attest)} onClick={run} data-testid="button-run-import">
            {mutation.isPending ? "Validating…" : dryRun ? "Validate payload" : "Import titles"}
          </button>
          <button className="button-secondary" onClick={() => { setText(""); setReport(null); setMessage(""); }} data-testid="button-clear-import">Clear</button>
          <span className="helper">No records are created during a dry run.</span>
        </div>
        {report && (
          <div className="space-y-4 border-t border-white/[0.08] pt-5" data-testid="status-import-report">
            <h3>{report.dryRun ? "Validation report" : "Import report"}</h3>
            <div className="metric-grid">
              <div className="metric"><span>Total</span><strong>{report.total}</strong></div>
              <div className="metric"><span>Created</span><strong className="text-emerald-400">{report.created}</strong></div>
              <div className="metric"><span>Updated</span><strong className="text-[#00D2FF]">{report.updated}</strong></div>
              <div className="metric"><span>Skipped</span><strong className="text-amber-400">{report.skipped}</strong></div>
            </div>
            {report.pendingReview !== undefined && <p className="helper">Pending review: {report.pendingReview}</p>}
            {report.issues?.length > 0 && (
              <div className="table-wrap rounded-xl border border-white/[0.08] bg-[#0B0D12]">
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Title</th><th>Issue</th></tr></thead>
                  <tbody>
                    {report.issues.map((i, n) => (
                      <tr key={`${i.row}-${n}`}><td>{i.row}</td><td>{i.title || "Not identified"}</td><td>{i.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
  return (
    <Shell admin>
      <div>
        <Heading
          eyebrow="Catalog & Rights · Import"
          title="Production Catalog Importer & Publisher"
          description="Validate additions, import draft records, complete rights review, and publish verified titles to the live catalog."
        />
        <ProductionImporterDashboard
          archiveCsvTabContent={archiveCsvTabContent}
          onCatalogUpdated={() => {
            qc.invalidateQueries({ queryKey: getListAdminTitlesQueryKey() });
            qc.invalidateQueries({ queryKey: getListPublicTitlesQueryKey() });
          }}
        />
      </div>
    </Shell>
  );
}
function CopyrightCases() {
  const [status,setStatus]=useState("");
  const params=useMemo(()=>status?{status:status as import("@workspace/api-client-react").CaseStatus}:undefined,[status]);
  const q=useListCopyrightCases(params);
  return <Shell admin><div><Heading eyebrow="Studio / copyright" title="Copyright cases" description="Review formal reports and counter-notices with their event history. Decisions should be documented." />
    <div className="field" style={{maxWidth:300,marginBottom:18}}><label>Filter by status</label><select value={status} onChange={e=>setStatus(e.target.value)} data-testid="input-case-filter"><option value="">All statuses</option>{["open","under-review","restricted","counter-notice-received","resolved","rejected","closed"].map(s=><option key={s}>{s}</option>)}</select></div>
    {q.isLoading?<div className="skeleton" style={{height:240}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:q.data?.length?<div className="panel table-wrap"><table className="data-table"><thead><tr><th>Case</th><th>Type</th><th>Reporter</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>{q.data.map(c=><tr key={c.id} data-testid={`row-copyright-case-${c.id}`}><td><strong>{c.caseNumber}</strong><div className="helper">{c.summary}</div></td><td>{c.caseType==="copyright-report"?"Copyright report":"Counter-notice"}</td><td>{c.reporterName}<div className="helper">{c.reporterEmail}</div></td><td><span className={`status ${c.status==="resolved"||c.status==="closed"?"good":"warn"}`} data-testid={`status-case-${c.id}`}>{c.status}</span></td><td>{stamp(c.submittedAt)}</td><td><Link href={`/admin/copyright/${c.id}`} className="button-secondary" data-testid={`link-case-${c.id}`}>Open</Link></td></tr>)}</tbody></table></div>:<Empty title="No copyright cases" icon={<FileCheck2 size={20}/>}>New reports and counter-notices will appear here when submitted.</Empty>}
  </div></Shell>;
}
function CopyrightCaseDetail({id}:{id:string}) {
  const qc=useQueryClient();
  const q=useGetCopyrightCase(id,{query:{enabled:!!id,queryKey:getGetCopyrightCaseQueryKey(id)}});
  const decide=useDecideCopyrightCase();
  const previewNotice=usePreviewCopyrightCaseCommunication();
  const sendNotice=useSendCopyrightCaseCommunication();
  const retryNotice=useRetryCopyrightCaseCommunication();
  const [message,setMessage]=useState("");
  const [noticeResult,setNoticeResult]=useState("");
  const [noticeNote,setNoticeNote]=useState("");
  const [noticePreview,setNoticePreview]=useState<CopyrightCaseCommunicationPreview|null>(null);
  const [noticeType,setNoticeType]=useState<CopyrightCaseCommunicationReview["noticeType"]>("receipt");
  const [noticeReviewed,setNoticeReviewed]=useState(false);
  if(q.isLoading)return <Shell admin><div className="skeleton" style={{height:260}}/></Shell>;
  if(q.isError||!q.data)return <Shell admin><div><Heading eyebrow="Studio / copyright" title="Case review"/><ErrorBox message={q.isError?errorText(q.error):"Case not found."} retry={()=>q.refetch()}/></div></Shell>;
  const c=q.data;
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);decide.mutate({id,data:{decision:String(f.get("decision")) as import("@workspace/api-client-react").CaseDecision["decision"],note:String(f.get("note")),recordRepeatInfringer:f.get("recordRepeat")==="on"}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetCopyrightCaseQueryKey(id)});qc.invalidateQueries({queryKey:getListCopyrightCasesQueryKey()});qc.invalidateQueries({queryKey:getGetAdminDashboardQueryKey()});setMessage("Decision and case history recorded.");},onError:e=>setMessage(errorText(e))});}
  function sendCommunication(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!noticePreview||!noticeReviewed){
      setNoticeResult("Preview the complete message and confirm your review before delivery.");
      return;
    }
    sendNotice.mutate({id,data:{previewEventId:noticePreview.previewEventId,noticeType,note:noticeNote,reviewed:true}},{
      onSuccess:r=>{
        setNoticeResult(r.message);
        setNoticeReviewed(false);
        qc.invalidateQueries({queryKey:getGetCopyrightCaseQueryKey(id)});
      },
      onError:e=>setNoticeResult(errorText(e)),
    });
  }
  function previewCommunication(){
    setNoticeReviewed(false);
    setNoticeResult("");
    setNoticePreview(null);
    previewNotice.mutate({id,data:{noticeType,note:noticeNote}},{
      onSuccess:r=>setNoticePreview(r),
      onError:e=>setNoticeResult(errorText(e)),
    });
  }
  function changeNoticeType(value:CopyrightCaseCommunicationReview["noticeType"]){
    setNoticeType(value);
    setNoticeReviewed(false);
    setNoticePreview(null);
  }
  function changeNoticeNote(value:string){
    setNoticeNote(value);
    setNoticeReviewed(false);
    setNoticePreview(null);
  }
  function retryCommunication(eventId:string){
    retryNotice.mutate({id,eventId},{
      onSuccess:r=>{
        setNoticeResult(r.message);
        qc.invalidateQueries({queryKey:getGetCopyrightCaseQueryKey(id)});
      },
      onError:e=>setNoticeResult(errorText(e)),
    });
  }
  const noticeRecipient = noticeType==="restriction"||noticeType==="counter-notice-invitation" ? "the recorded uploader" : "the case submitter";
  const counterInviteAvailable=c.caseType==="copyright-report"&&c.status==="restricted";
  return <Shell admin><div><Heading eyebrow={`Studio / case ${c.caseNumber}`} title="Case history" description={`${c.caseType==="copyright-report"?"Copyright report":"Counter-notice"} · Submitted ${stamp(c.submittedAt)}`} />
     <div className="panel"><div className="feature-line"><span className={`status ${c.status==="closed"||c.status==="resolved"?"good":"warn"}`} data-testid="status-case-detail">{c.status}</span><span>Reporter: {c.reporterName}</span></div><h2 style={{marginTop:16}}>{c.summary}</h2><div className="helper wrap">Reporter email: {c.reporterEmail}</div>{c.caseType==="copyright-report"&&<div className="notice" style={{marginTop:16}}><Info size={17}/><span>A counter-notice link is available only through a reviewed communication for a restricted case. A submitted counter-notice never restores content automatically.</span></div>}<details style={{marginTop:18}}><summary className="helper" style={{cursor:"pointer"}}>Submitted details (sensitive)</summary><pre className="helper wrap" style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(c.payload,null,2)}</pre></details></div>
    <div className="panel">
      <h2>Case email communication</h2>
      <div className="notice" style={{marginBottom:16}}><Info size={17}/><span>No approved email provider and verified sender are connected. Delivery attempts will be recorded as failed until an approved sender is configured.</span></div>
      <form onSubmit={sendCommunication}>
        <div className="field-grid">
          <div className="field"><label htmlFor="case-notice-type">Notice type</label><select id="case-notice-type" value={noticeType} onChange={e=>changeNoticeType(e.target.value as CopyrightCaseCommunicationReview["noticeType"])} data-testid="input-case-notice-type">
            <option value="receipt">Receipt to submitter</option>
            <option value="status-update">Status update to submitter</option>
            <option value="restriction" disabled={!counterInviteAvailable}>Restriction notice to uploader</option>
            <option value="counter-notice-invitation" disabled={!counterInviteAvailable}>Counter-notice link to uploader</option>
          </select></div>
          <div className="field full"><label htmlFor="case-communication-note">Message note</label><textarea id="case-communication-note" value={noticeNote} onChange={e=>changeNoticeNote(e.target.value)} required minLength={1} maxLength={2000} data-testid="input-case-communication-note" placeholder="Enter the case-specific explanation staff reviewed." /></div>
          <label className="field full helper"><span><input type="checkbox" checked={noticeReviewed} onChange={e=>setNoticeReviewed(e.target.checked)} required disabled={!noticePreview} data-testid="input-case-communication-reviewed"/> I reviewed the case, recipient, complete message, and any counter-notice link before attempting delivery.</span></label>
        </div>
        <p className="helper" style={{marginTop:12}}>This notice will go to {noticeRecipient}. The recipient address is resolved from the case submitter or the title’s recorded uploader, never entered manually.</p>
        {noticeType==="counter-notice-invitation"&&<p className="helper" data-testid="status-counter-link-gate">The case-specific counter-notice link is included only in this reviewed communication. Sending it does not restore restricted content.</p>}
        {noticePreview&&<div className="panel" style={{marginTop:16}} data-testid="panel-case-communication-preview"><h3>Email preview</h3><p><strong>To:</strong> {noticePreview.recipientName} ({noticePreview.maskedRecipientEmail}; {noticePreview.recipientRole})</p><p><strong>Subject:</strong> {noticePreview.subject}</p><pre className="helper wrap" style={{whiteSpace:"pre-wrap"}}>{noticePreview.text}</pre><p className="helper">{noticePreview.canDeliver?"Sender is ready.":"Delivery is blocked: "+noticePreview.blockReason}</p></div>}
        {noticeResult&&<p className="form-message" role="status" data-testid="status-case-communication">{noticeResult}</p>}
        <div className="form-actions"><button className="button-secondary" type="button" onClick={previewCommunication} disabled={previewNotice.isPending||!noticeNote.trim()} data-testid="button-preview-case-communication">{previewNotice.isPending?"Preparing preview…":"Preview email"}</button><button className="button" disabled={sendNotice.isPending||!noticeReviewed} data-testid="button-send-case-communication">{sendNotice.isPending?"Recording…":"Confirm review and attempt delivery"}</button></div>
      </form>
    </div>
    <div className="panel"><h2>Event history</h2>{c.events?.length?c.events.map(ev=><div className="rights-row" key={ev.id} data-testid={`row-case-event-${ev.id}`}><div><strong>{ev.eventType}</strong><p>{ev.note}</p>{ev.eventType==="copyright_notice_delivery_failed"&&<button className="button-secondary" type="button" onClick={()=>retryCommunication(ev.id)} disabled={retryNotice.isPending} data-testid={`button-retry-case-communication-${ev.id}`}>Retry reviewed email</button>}</div><div className="helper">{ev.actorName}<br/>{stamp(ev.createdAt)}</div></div>):<Empty title="No recorded events">Case decisions and communications will be captured here.</Empty>}</div>
    <form className="panel" onSubmit={submit}><h2>Record a decision</h2><div className="field-grid"><div className="field"><label>Decision</label><select name="decision" data-testid="input-case-decision">{["acknowledge","request-info","restrict","remove","restore","reject","close"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>Reviewer note</label><textarea name="note" required maxLength={4000} data-testid="input-case-note"/></div><label className="field full helper"><span><input type="checkbox" name="recordRepeat" data-testid="input-case-repeat-infringer"/> Record a repeat-infringer strike only if independently confirmed and appropriate.</span></label></div>{message&&<p className="form-message success" data-testid="status-case-decision">{message}</p>}<div className="form-actions"><button className="button" disabled={decide.isPending} data-testid="button-decide-case">{decide.isPending?"Saving…":"Save decision"}</button><Link href="/admin/copyright" className="button-secondary">Back to cases</Link></div></form>
  </div></Shell>;
}
function RepeatInfringers() {
  const q=useListRepeatInfringers(); const qc=useQueryClient(); const record=useRecordRepeatInfringer(); const [message,setMessage]=useState("");
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);record.mutate({data:{userId:String(f.get("userId")),caseId:String(f.get("caseId")||"")||null,reason:String(f.get("reason"))}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListRepeatInfringersQueryKey()});qc.invalidateQueries({queryKey:getGetAdminDashboardQueryKey()});setMessage("Confirmed record added.");e.currentTarget.reset();},onError:e=>setMessage(errorText(e))});}
  return <Shell admin><div><Heading eyebrow="Studio / enforcement" title="Repeat infringers" description="Maintain confirmed records with a traceable rationale. Do not record allegations as confirmed strikes." />
    <form className="panel" onSubmit={submit}><h2>Add confirmed record</h2><div className="field-grid"><div className="field"><label>User ID</label><input name="userId" required data-testid="input-infringer-user"/></div><div className="field"><label>Related case ID (optional)</label><input name="caseId" data-testid="input-infringer-case"/></div><div className="field full"><label>Reason and basis for confirmation</label><textarea name="reason" required minLength={10} maxLength={4000} data-testid="input-infringer-reason"/></div></div>{message&&<p className="form-message success" data-testid="status-infringer">{message}</p>}<div className="form-actions"><button className="button" disabled={record.isPending} data-testid="button-record-infringer">{record.isPending?"Recording…":"Record confirmed strike"}</button></div></form>
    <div className="panel" style={{marginTop:16}}><h2>Confirmed records</h2>{q.isLoading?<div className="skeleton" style={{height:180}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:q.data?.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Case</th><th>Strikes</th><th>Reason</th><th>Recorded</th></tr></thead><tbody>{q.data.map(r=><tr key={r.id} data-testid={`row-infringer-${r.id}`}><td>{r.userId}</td><td>{r.caseId||"Not linked"}</td><td><span className="status warn" data-testid={`status-strikes-${r.id}`}>{r.strikeCount??1}</span></td><td>{r.reason}</td><td>{stamp(r.createdAt)}</td></tr>)}</tbody></table></div>:<Empty title="No confirmed repeat-infringer records" icon={<ShieldCheck size={20}/>}>Confirmed records will be listed after a documented review.</Empty>}</div>
  </div></Shell>;
}
function AdminSettingsPage() {
  const qc=useQueryClient();const q=useGetAdminSettings();const save=useUpdateAdminSettings();const [message,setMessage]=useState("");
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);save.mutate({data:{name:String(f.get("name")),tagline:String(f.get("tagline"))}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetAdminSettingsQueryKey()});qc.invalidateQueries({queryKey:getGetSiteConfigQueryKey()});setMessage("Site configuration saved.");},onError:e=>setMessage(errorText(e))});}
  return <Shell admin><div><Heading eyebrow="Studio / configuration" title="Site settings" description="Configure public site text and whether copyright contact details are actually ready to display. No contact details are created here." />
    {q.isLoading?<div className="skeleton" style={{height:220}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:<form className="panel" onSubmit={submit}><div className="field-grid"><div className="field"><label>Site name</label><input name="name" defaultValue={q.data?.name||"FamilyFlix"} maxLength={120} required data-testid="input-site-name"/></div><div className="field"><label>Tagline</label><input name="tagline" defaultValue={q.data?.tagline||""} maxLength={240} data-testid="input-site-tagline"/></div></div><div className="notice" style={{marginTop:16}}><Info size={16}/><span>Copyright contact status: <strong>{q.data?.copyrightContactReady?"Configured in the public site settings":"Not configured"}</strong>. This page does not set or invent legal contact details.</span></div>{message&&<p className="form-message success" data-testid="status-settings">{message}</p>}<div className="form-actions"><button className="button" disabled={save.isPending} data-testid="button-save-settings">{save.isPending?"Saving…":"Save settings"}</button></div></form>}
  </div></Shell>;
}
function StaffPage() {
  const q=useListStaff();const qc=useQueryClient();const create=useCreateStaff();const update=useUpdateStaff();const [message,setMessage]=useState("");
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);create.mutate({data:{name:String(f.get("name")),email:String(f.get("email")),password:String(f.get("password")),role:String(f.get("role")) as StaffInputRole}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListStaffQueryKey()});setMessage("Staff member added.");e.currentTarget.reset();},onError:e=>setMessage(errorText(e))});}
  return <Shell admin><div><Heading eyebrow="Studio / access" title="Staff & roles" description="Grant the least access needed. Changes to roles and account status are recorded by the platform." />
    <form className="panel" onSubmit={submit}><h2>Add staff member</h2><div className="field-grid"><div className="field"><label>Name</label><input name="name" required data-testid="input-staff-name"/></div><div className="field"><label>Email</label><input type="email" name="email" required data-testid="input-staff-email"/></div><div className="field"><label>Temporary password</label><input type="password" name="password" minLength={10} required data-testid="input-staff-password"/></div><div className="field"><label>Role</label><select name="role" data-testid="input-staff-role"><option value="moderator">Moderator</option><option value="admin">Admin</option></select></div></div>{message&&<p className="form-message success" data-testid="status-staff">{message}</p>}<div className="form-actions"><button className="button" disabled={create.isPending} data-testid="button-create-staff">Add staff</button></div></form>
    <div className="panel" style={{marginTop:16}}><h2>Current team</h2>{q.isLoading?<div className="skeleton" style={{height:180}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:q.data?.length?q.data.map(s=><div key={s.id} className="rights-row" data-testid={`row-staff-${s.id}`}><div><strong>{s.name}</strong><p>{s.email}</p><span className="status" data-testid={`status-staff-role-${s.id}`}>{s.role}{s.banned?" · disabled":""}</span></div><div className="form-actions"><select aria-label={`Role for ${s.name}`} value={s.role} onChange={e=>update.mutate({id:s.id,data:{action:"role",role:e.target.value as StaffUpdateRole}},{onSuccess:()=>qc.invalidateQueries({queryKey:getListStaffQueryKey()}),onError:e=>setMessage(errorText(e))})} data-testid={`input-staff-update-role-${s.id}`}><option value="admin">Admin</option><option value="moderator">Moderator</option><option value="user">User</option></select><button className="button-secondary" onClick={()=>update.mutate({id:s.id,data:{action:s.banned?"unban":"ban"}},{onSuccess:()=>qc.invalidateQueries({queryKey:getListStaffQueryKey()}),onError:e=>setMessage(errorText(e))})} data-testid={`button-staff-ban-${s.id}`}>{s.banned?"Enable":"Disable"}</button></div></div>):<Empty title="No staff records">The team list will be populated through the configured staff management workflow.</Empty>}</div>
  </div></Shell>;
}
function ActivityPage() {
  const q=useListAdminActivity({limit:100});
  return <Shell admin><div><Heading eyebrow="Studio / audit" title="Activity history" description="Actions from catalog review, copyright decisions and staff operations." />
    {q.isLoading?<div className="skeleton" style={{height:200}}/>:q.isError?<ErrorBox message={errorText(q.error)} retry={()=>q.refetch()}/>:q.data?.length?<div className="panel table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th><th>Details</th></tr></thead><tbody>{q.data.map(e=><tr key={e.id} data-testid={`row-activity-${e.id}`}><td>{stamp(e.createdAt)}</td><td><span className="status" data-testid={`status-activity-${e.id}`}>{e.action}</span></td><td>{e.entity}{e.entityId&&<div className="helper">{e.entityId}</div>}</td><td>{e.actorName||"System"}</td><td className="helper">{e.detail?JSON.stringify(e.detail):"—"}</td></tr>)}</tbody></table></div>:<Empty title="No activity recorded" icon={<Clock3 size={19}/>}>When staff make catalog or case changes, their audit events will appear here.</Empty>}
  </div></Shell>;
}
function NotFound() {
  return <Shell><div className="empty-state"><span className="empty-icon"><CircleHelp size={20}/></span><h3>This page isn’t in the catalog</h3><p>The link may be out of date, or the title may not be approved for FamilyFlix.</p><Link href="/" className="button" style={{marginTop:16}}>Return to discovery</Link></div></Shell>;
}
function AdminMonetizationPage() {
  return (
    <Shell admin>
      <div>
        <Heading
          eyebrow="Studio / Monetization & Verification"
          title="Monetization, VAST Ads & Ad Network Verification"
          description="Manage VAST video ad links, ads.txt authorized sellers, crawler robots.txt, XML sitemap, and Google AdSense / Media.net technical domain verification."
        />
        <AdminMonetization />
      </div>
    </Shell>
  );
}
function AdminDeveloperPage() {
  return (
    <Shell admin>
      <div className="space-y-6">
        <Heading
          eyebrow="Studio / Developer Platform"
          title="Developer Ecosystem & API Gateway"
          description="Manage developer API keys, Demure AI model registry, and credit allocations across FamilyFlix By DemureGram."
        />
        <AdminDeveloperManager />
      </div>
    </Shell>
  );
}
function AppRoutes() {
  return <Switch>
    <Route path="/" component={()=> <Catalog home/>}/>
    <Route path="/movies" component={()=> <Catalog kind="movie"/>}/>
    <Route path="/tv-shows" component={()=> <Catalog kind="series"/>}/>
    <Route path="/categories" component={()=> <Shell fullBleed><CategoriesDirectory/></Shell>}/>
    <Route path="/category/:slug">{p=>p?<Shell fullBleed><CategoryPage slug={p.slug}/></Shell>:null}</Route>
    <Route path="/developers" component={DeveloperHome}/>
    <Route path="/developers/dashboard" component={DeveloperDashboard}/>
    <Route path="/developers/keys" component={DeveloperKeys}/>
    <Route path="/developers/playground" component={DeveloperPlayground}/>
    <Route path="/developers/billing" component={DeveloperBilling}/>
    <Route path="/developers/credits" component={DeveloperCredits}/>
    <Route path="/developers/docs" component={DeveloperDocs}/>
    <Route path="/search" component={SearchPage}/>
    <Route path="/title/:slug">{p=>p?<DetailPage slug={p.slug}/>:null}</Route>
    <Route path="/watch/:slug/:episodeId">{p=>p?<WatchPage slug={p.slug} episodeId={p.episodeId}/>:null}</Route>
    <Route path="/watch/:slug">{p=>p?<WatchPage slug={p.slug}/>:null}</Route>
    <Route path="/my-list" component={MyListPage}/>
    <Route path="/auth/sign-in" component={()=> <AuthPage/>}/>
    <Route path="/auth/sign-up" component={()=> <AuthPage signup/>}/>
    <Route path="/onboarding" component={OnboardingPage}/>
    <Route path="/copyright/report" component={CopyrightReportPage}/>
    <Route path="/copyright/counter-notice/:caseNumber">{p=>p?<CounterNoticePage caseNumber={p.caseNumber}/>:null}</Route>
    <Route path="/about" component={()=> <PublicInfo page="about"/>}/>
    <Route path="/contact" component={()=> <PublicInfo page="contact"/>}/>
    <Route path="/terms" component={()=> <PublicInfo page="terms"/>}/>
    <Route path="/repeat-infringer-policy" component={()=> <PublicInfo page="repeat-infringer-policy"/>}/>
    <Route path="/privacy" component={()=> <PublicInfo page="privacy"/>}/>
    <Route path="/dmca" component={()=> <PublicInfo page="dmca"/>}/>
    <Route path="/account" component={AccountSettingsPage}/>
    <Route path="/profile" component={AccountSettingsPage}/>
    <Route path="/settings" component={AccountSettingsPage}/>
    <Route path="/admin" component={()=> <AdminGate><AdminOverview/></AdminGate>}/>
    <Route path="/admin/moderation" component={()=> <AdminGate><ModeratorPortal/></AdminGate>}/>
    <Route path="/admin/ads" component={()=> <AdminGate adminOnly><AdBreakManager/></AdminGate>}/>
    <Route path="/admin/monetization" component={()=> <AdminGate adminOnly><AdminMonetizationPage/></AdminGate>}/>
    <Route path="/admin/ai-concierge" component={()=> <AdminGate adminOnly><AdminAiConciergePage/></AdminGate>}/>
    <Route path="/admin/users" component={()=> <AdminGate adminOnly><UserManager/></AdminGate>}/>
    <Route path="/admin/library" component={()=> <AdminGate><AdminLibrary/></AdminGate>}/>
    <Route path="/admin/developer" component={()=> <AdminGate adminOnly><AdminDeveloperPage/></AdminGate>}/>
    <Route path="/admin/library/new" component={()=> <AdminGate adminOnly><AdminTitleCreate/></AdminGate>}/>
    <Route path="/admin/library/:id">{p=>p?<AdminGate adminOnly><AdminTitleDetail id={p.id}/></AdminGate>:null}</Route>
    <Route path="/admin/import" component={()=> <AdminGate adminOnly><AdminImport/></AdminGate>}/>
    <Route path="/admin/copyright" component={()=> <AdminGate adminOnly><CopyrightCases/></AdminGate>}/>
    <Route path="/admin/copyright/:id">{p=>p?<AdminGate adminOnly><CopyrightCaseDetail id={p.id}/></AdminGate>:null}</Route>
    <Route path="/admin/repeat-infringers" component={()=> <AdminGate adminOnly><RepeatInfringers/></AdminGate>}/>
    <Route path="/admin/settings" component={()=> <AdminGate adminOnly><AdminSettingsPage/></AdminGate>}/>
    <Route path="/admin/staff" component={()=> <AdminGate adminOnly><StaffPage/></AdminGate>}/>
    <Route path="/admin/activity" component={()=> <AdminGate><ActivityPage/></AdminGate>}/>
    <Route component={NotFound}/>
  </Switch>;
}
export default function App() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location.startsWith("/familyflix")) {
      const target = location.replace(/^\/familyflix\/?/, "/") || "/";
      setLocation(target);
    }
  }, [location, setLocation]);
  return (
    <SubscriptionProvider>
      <ProfileProvider>
        <Router>
          <AppRoutes />
          <AiConciergeWidget />
        </Router>
      </ProfileProvider>
    </SubscriptionProvider>
  );
}
