import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, Redirect, Route, Router, Switch, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Hls from "hls.js";
import { Upload as TusUpload } from "tus-js-client";
import {
  ArrowLeft, ArrowRight, Bookmark, Check, CircleHelp, Clapperboard, Clock3,
  Copyright, FileCheck2, Film, History, Info, LayoutDashboard, LibraryBig,
  LockKeyhole, Menu, Play, Search, Settings2, ShieldAlert, ShieldCheck,
  Upload, UserRound, UsersRound, X,
} from "lucide-react";
import {
  useAddTitleRightsAsset, useAddTitleSubtitle, useCreateAdminTitle,
  useCreateCloudflareUpload, useCreateStaff, useDecideCopyrightCase,
  useDeleteAdminTitle, useDeleteTitleSubtitle, useGetAdminDashboard,
  useGetAdminSettings, useGetAdminTitle, useGetCopyrightCase, useGetPlayback,
  useGetPublicTitle, useGetSiteConfig, useGetUserPreferences,
  useHealthCheck, useImportTitles, useListAdminActivity, useListAdminTitles,
  useListCopyrightCases, useListPublicTitles, useListRepeatInfringers,
  useListStaff, useListTitleRightsAssets, useListTitleSubtitles,
  usePublishAdminTitle, useRecordRepeatInfringer, useReviewTitleRights, useSaveUserPreferences,
  useSetTitleStream, useSubmitCopyrightReport, useSubmitCounterNotice,
  useSyncCloudflareStream, useUpdateAdminSettings, useUpdateAdminTitle,
  useUpdateStaff, getGetAdminDashboardQueryKey, getGetAdminSettingsQueryKey,
  getGetAdminTitleQueryKey, getGetCopyrightCaseQueryKey, getGetPlaybackQueryKey,
  getGetPublicTitleQueryKey, getGetSiteConfigQueryKey,
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
  PublicTitle, PublicTitleDetail, RightsInput,
} from "@workspace/api-client-react";
import { authClient } from "./lib/auth-client";

const genres = ["Adventure", "Animation", "Comedy", "Documentary", "Drama", "Family", "Fantasy", "History", "Mystery", "Music", "Science fiction"];
const ADMIN_NAV: [string, string, typeof LayoutDashboard][] = [
  ["/admin", "Overview", LayoutDashboard], ["/admin/library", "Library & rights", LibraryBig],
  ["/admin/import", "Import titles", Upload], ["/admin/copyright", "Copyright cases", Copyright],
  ["/admin/repeat-infringers", "Repeat infringers", ShieldAlert], ["/admin/settings", "Site settings", Settings2],
  ["/admin/staff", "Staff access", UsersRound], ["/admin/activity", "Activity log", History],
];
const inputClass = "field";
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024 * 1024;
const stamp = (s?: string | null) => s ? new Date(s).toLocaleDateString() : "Not specified";
const errorText = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";
const isoDateTime = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : null;
function Brand() {
  return <Link href="/" className="brand-lockup" data-testid="link-familyflix-home" aria-label="DemureGram home">
    <span className="brand-mark"><Play size={16} fill="currentColor" /></span>
    <span><span className="brand-word">Demure<b>Gram</b></span><span className="platform-label">FamilyFlix film &amp; TV catalog</span></span>
  </Link>;
}
function Header() {
  const [path] = useLocation();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { name?: string; role?: string } } | null | undefined;
  const user = session?.user;
  const links = [["/", "Discover"], ["/movies", "Movies"], ["/tv-shows", "TV shows"], ["/my-list", "My list"]];
  return <header className="topbar">
    <Brand />
    <nav className="main-nav" aria-label="Main navigation">
      {links.map(([href, label]) => <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`} data-testid={`link-nav-${label.toLowerCase().replace(" ", "-")}`}>{label}</Link>)}
    </nav>
    <div className="top-actions">
      <Link href="/search" className="icon-link" aria-label="Search approved titles" data-testid="link-search"><Search size={19} /></Link>
      {user ? <><Link href="/onboarding" className="button-secondary" data-testid="link-account"><UserRound size={15} /> {user.name || "Account"}</Link><button className="quiet-button" onClick={async()=>{await authClient.signOut({});navigate("/");}} data-testid="button-sign-out">Sign out</button></> : <Link href="/auth/sign-in" className="button-secondary" data-testid="link-sign-in"><UserRound size={15} /> Sign in</Link>}
      <button className="quiet-button menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} data-testid="button-mobile-menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation" style={{ position: "absolute", top: 64, left: 0, right: 0, padding: 16, flexDirection: "column", background: "hsl(258 24% 8%)", borderBottom: "1px solid hsl(260 14% 25%)" }}>
      {[...links, ["/about", "About"], ["/copyright/report", "Copyright report"]].map(([href, label]) => <Link onClick={() => setOpen(false)} key={href} className="nav-link" href={href} data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ","-")}`}>{label}</Link>)}
    </nav>}
  </header>;
}
function Footer() {
  return <footer className="app-footer">
     <span>DemureGram · FamilyFlix film &amp; TV catalog. Third-party titles remain the property of their respective rights holders. <span className="legal-draft">Copyright © 2026 DEMUREGRAM LLC — legal draft for counsel review; entity details require confirmation.</span></span>
     <span className="feature-line"><Link href="/about" data-testid="link-footer-about">About</Link><Link href="/contact" data-testid="link-footer-contact">Contact</Link><Link href="/terms" data-testid="link-footer-terms">Terms</Link><Link href="/repeat-infringer-policy" data-testid="link-footer-repeat-policy">Repeat-infringer policy</Link><Link href="/privacy" data-testid="link-footer-privacy">Privacy</Link><Link href="/copyright/report" data-testid="link-footer-copyright">Copyright</Link></span>
  </footer>;
}
function Shell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  return <div className="site-shell"><Header /><main className="page-content">{admin ? <div className="admin-layout"><AdminRail />{children}</div> : children}</main><Footer /></div>;
}
function AdminRail() {
  const [path] = useLocation();
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { role?: string } } | null | undefined;
  const links = session?.user?.role === "admin"
    ? ADMIN_NAV
    : ADMIN_NAV.filter(([href]) => ["/admin", "/admin/library", "/admin/activity"].includes(href));
  return <aside className="admin-rail"><div className="admin-rail-label">DemureGram / studio</div>
    {links.map(([href, name, Icon]) => <Link key={href} href={href} className={`admin-link ${path === href || (href !== "/admin" && path.startsWith(href)) ? "active" : ""}`} data-testid={`link-admin-${name.toLowerCase().replaceAll(" ", "-")}`}><Icon size={15} aria-hidden="true"/>{name}</Link>)}
  </aside>;
}
function AdminGate({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { data: sessionData, isPending } = authClient.useSession();
  const session = sessionData as unknown as { user?: { role?: string } } | null | undefined;
  const role = session?.user?.role;
  if (isPending) return <Shell><div className="skeleton" style={{ height: 240 }} aria-label="Checking studio access" /></Shell>;
  if (!session?.user) return <Redirect to="/auth/sign-in" />;
  if ((role !== "admin" && role !== "moderator") || (adminOnly && role !== "admin")) return <Shell><div className="permission-card" role="alert" data-testid="status-admin-forbidden"><span className="status warn">Permission required</span><h1>{adminOnly ? "Administrator access required." : "Staff access only."}</h1><p>You’re signed in, but this account does not have permission for this studio area. Contact an administrator through the configured platform process. The server remains authoritative for every admin operation.</p><Link href="/" className="button-secondary">Return to catalog</Link></div></Shell>;
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
function Poster({ title, className = "" }: { title: Pick<PublicTitle, "id" | "name" | "kind"> & { posterUrl?: string | null }; className?: string }) {
  const image = title.posterUrl;
  return <div className={`poster ${image ? "has-image" : ""} ${className}`} style={image ? { backgroundImage: `linear-gradient(0deg,hsl(258 25% 7% / .94),transparent 54%),url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} data-testid={`poster-title-${title.id}`} aria-label={`${title.name}${image ? " poster art" : " artwork placeholder"}`}><span className="poster-stamp">{title.kind === "series" ? "Series" : title.kind}</span><span className="poster-title">{title.name}</span><span className="poster-open"><ArrowRight size={15} /></span></div>;
}
function TitleCards({ titles }: { titles: PublicTitle[] }) {
  return <div className="title-grid">{titles.map(t => <Link key={t.id} href={`/title/${t.slug}`} className="title-card" data-testid={`card-title-${t.id}`}><Poster title={t} /><div className="card-copy"><strong>{t.name}</strong><span>{t.year || "Year not listed"} · {t.genres?.slice(0,2).join(" · ") || "Approved catalog"}</span></div></Link>)}</div>;
}
function Catalog({ kind, query, home = false }: { kind?: "movie" | "series"; query?: string; home?: boolean }) {
  const params = useMemo(() => ({ ...(kind ? { kind } : {}), ...(query ? { query } : {}), limit: 100 }), [kind, query]);
  const q = useListPublicTitles(params);
  const titles = q.data ?? [];
  const featured = titles.find(t => t.featured);
  return <Shell>
    {home && <section className="hero" data-testid="section-featured-catalog"><div className="hero-copy">
      <span className="eyebrow">A little more considered</span>
      <h1>Good stories.<br />Clear rights.</h1>
      <p>Find films and series with their permissions in plain view. FamilyFlix is the movie and TV catalog within DemureGram—only titles approved for this catalog appear here.</p>
      {featured && <div className="hero-meta"><span className="rights-chip"><ShieldCheck size={13} /> Rights reviewed</span><span>{featured.name} · {featured.year ?? "Year unlisted"}</span></div>}
      <div className="hero-actions"><Link href={featured ? `/title/${featured.slug}` : "/movies"} className="button" data-testid="button-browse-approved"><Clapperboard size={16} /> Browse approved titles</Link><Link href="/about" className="button-secondary" data-testid="link-rights-policy"><Info size={15} /> How rights work</Link></div>
    </div></section>}
    <Heading eyebrow={home ? "The approved catalog" : query ? "Catalog search" : kind === "movie" ? "Feature films" : kind === "series" ? "Series" : "All approved titles"} title={home ? "Find your next good watch." : query ? `Results for “${query}”` : kind === "movie" ? "Movies" : kind === "series" ? "TV shows" : "Approved titles"} description="Every title listed here has passed the catalog’s rights review. Availability can vary by territory and time." />
    {q.isLoading ? <LoadingGrid /> : q.isError ? <ErrorBox message={errorText(q.error)} retry={() => q.refetch()} /> : titles.length ? <TitleCards titles={titles} /> : <Empty title="Nothing in the catalog yet" icon={<Clapperboard size={20} />}>When titles are approved for FamilyFlix, they’ll appear here. Try a different category or return later.</Empty>}
    <section className="notice" style={{ marginTop: 36 }} data-testid="status-rights-transparency"><ShieldCheck size={18} /><span><strong>Rights before play.</strong> FamilyFlix displays rights-holder and license details supplied and reviewed for each title. DemureGram does not claim ownership of third-party films.</span></section>
  </Shell>;
}
function SearchPage() {
  const [query, setQuery] = useState("");
  const q = useListPublicTitles({ query: query.trim() || undefined, limit: 100 });
  return <Shell><Heading eyebrow="Search the approved catalog" title="What are you in the mood for?" description="Search only titles approved for FamilyFlix. No unreviewed uploads appear in results." />
    <label className="field" style={{ maxWidth: 680, marginBottom: 28 }}><span className="helper">Title, creator or genre</span><div style={{ position: "relative" }}><Search size={17} style={{ position: "absolute", top: 13, left: 13, color: "hsl(260 10% 66%)" }} /><input className="search-box" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search approved titles…" data-testid="input-catalog-search" style={{ paddingLeft: 40 }} /></div></label>
    {q.isLoading ? <LoadingGrid /> : q.isError ? <ErrorBox message={errorText(q.error)} retry={() => q.refetch()} /> : q.data?.length ? <TitleCards titles={q.data} /> : <Empty title={query ? "No matching approved titles" : "The catalog is waiting for its first title"} icon={<Search size={19} />}>{query ? "Try another title, creator or category. Only cleared catalog entries are searchable." : "Search results will appear as FamilyFlix-approved titles are added."}</Empty>}
  </Shell>;
}
function DetailPage({ slug }: { slug: string }) {
  const q = useGetPublicTitle(slug, { query: { enabled: !!slug, queryKey: getGetPublicTitleQueryKey(slug) } });
  const detail = q.data as PublicTitleDetail | undefined;
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem("ff-list") || "[]").includes(slug); } catch { return false; } });
  function toggleSaved() {
    let slugs: string[] = [];
    try { slugs = JSON.parse(localStorage.getItem("ff-list") || "[]"); } catch { slugs = []; }
    const next = saved ? slugs.filter(s => s !== slug) : [...new Set([...slugs, slug])];
    localStorage.setItem("ff-list", JSON.stringify(next));
    setSaved(!saved);
  }
  if (q.isLoading) return <Shell><div className="detail-layout"><div className="skeleton detail-poster" /><div><div className="skeleton" style={{ height: 320 }} /></div></div></Shell>;
  if (q.isError || !detail) return <Shell><ErrorBox message={q.isError ? errorText(q.error) : "This title isn’t available in the approved catalog."} retry={() => q.refetch()} /></Shell>;
  return <Shell><Link href="/" className="feature-line" data-testid="link-back-catalog"><ArrowLeft size={15} /> Back to catalog</Link>
    <div className="detail-layout" style={{ marginTop: 25 }}><Poster title={detail} className="detail-poster" /><div>
      <span className="eyebrow">Approved FamilyFlix title</span><h1 className="display-title" style={{ marginTop: 10 }}>{detail.name}</h1>
      {detail.tagline && <p style={{ color: "hsl(19 83% 67%)", fontStyle: "italic" }}>{detail.tagline}</p>}
      <div className="hero-meta"><span>{detail.year ?? "Year not listed"}</span><span>·</span><span>{detail.kind === "series" ? "Series" : detail.kind}</span>{detail.durationMinutes && <><span>·</span><span>{detail.durationMinutes} min</span></>}{detail.rating && <><span>·</span><span>{detail.rating}</span></>}</div>
      <p style={{ maxWidth: 670, color: "hsl(260 10% 78%)", lineHeight: 1.8 }}>{detail.synopsis || "No synopsis has been provided."}</p>
      <p className="helper">Creator attribution: <strong style={{ color: "hsl(42 26% 92%)" }}>{detail.creatorAttribution || "Not supplied"}</strong></p>
      {detail.cast?.length > 0 && <p className="helper">Featuring: {detail.cast.join(", ")}</p>}
      <div className="form-actions"><Link href={`/watch/${detail.slug}`} className="button" data-testid="button-play-title"><Play size={15} fill="currentColor" /> Check playback availability</Link><button className="button-secondary" onClick={toggleSaved} data-testid="button-save-title"><Bookmark size={15} /> {saved ? "Remove from my list" : "Save to my list"}</button><Link href={`/copyright/report?title=${encodeURIComponent(detail.id)}`} className="quiet-button" data-testid="link-report-title">Report a concern</Link></div>
      <section className="panel" style={{ marginTop: 28 }}><h2><ShieldCheck size={17} style={{ verticalAlign: "middle", marginRight: 8, color: "hsl(157 35% 67%)" }} />Rights & attribution</h2><p className="helper" style={{ marginBottom: 16 }}>FamilyFlix presents this title under the terms shown below. Rights information reflects records reviewed for this catalog and does not imply DemureGram owns the work.</p>
         {detail.rights?.length ? detail.rights.map((r,i) => <div className="rights-row" key={`${r.assetKind}-${i}`} data-testid={`status-rights-record-${i}`}><div><strong>{r.assetLabel || r.assetKind}</strong><p>Asset type: {r.assetKind}</p><p>Rights holder: {r.rightsHolder || "Not stated"}</p><p>Creator: {r.creatorAttribution || "Not stated"}</p><p>License: {r.licenseType} {r.licenseVersion ? `· ${r.licenseVersion}` : ""}</p><p>Restrictions: {r.usageRestrictions?.length ? r.usageRestrictions.join("; ") : "None listed"}</p><p>Territory: {r.territory || "Not specified"} · Expires: {stamp(r.expiresAt)}</p></div><div>{r.licenseUrl && <a className="status good" href={r.licenseUrl} target="_blank" rel="noreferrer" data-testid={`link-license-${i}`}>License details ↗</a>}{r.sourceUrl && <p><a href={r.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-rights-source-${i}`}>Source record ↗</a></p>}</div></div>) : <Empty title="Rights details are not available">Contact the catalog team through the copyright report form if you have a question about this listing.</Empty>}
      </section>
    </div></div>
  </Shell>;
}
function WatchPage({ slug }: { slug: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const p = useGetPlayback(slug, { query: { enabled: !!slug, queryKey: getGetPlaybackQueryKey(slug), retry: false } });
  const playback = p.data;
  const isSafeUrl = !!playback?.url && /^https?:/i.test(playback.url) && !/^(magnet:|torrent:)/i.test(playback.url);
  useEffect(() => {
    const video = videoRef.current;
    const url = playback?.url;
    if (!video || !url || !/\.m3u8(?:$|[?#])/i.test(url)) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return () => { video.removeAttribute("src"); video.load(); };
    }
    if (!Hls.isSupported()) return;
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [playback?.url]);
  return <Shell><Heading eyebrow="Approved playback" title={playback?.titleName || "Playback check"} description="Playback is available only when the server returns an approved media source for this title." />
    {p.isLoading ? <div className="skeleton" style={{ height: 400 }} /> : p.isError ? <div className="empty-state"><span className="empty-icon"><LockKeyhole size={20} /></span><h3>Playback is not available</h3><p>This title has no server-approved stream available right now. No external or peer-to-peer media links are offered.</p><Link href={`/title/${slug}`} className="button-secondary" style={{ marginTop: 16 }} data-testid="link-playback-title">View title and rights details</Link></div> : isSafeUrl ? <div className="panel"><div className="feature-line" data-testid="status-approved-playback"><ShieldCheck size={16} /> Server-approved source · {playback.streamType}</div><video ref={videoRef} controls playsInline preload="metadata" poster={playback.posterUrl || undefined} src={/\.m3u8(?:$|[?#])/i.test(playback.url) ? undefined : playback.url} style={{ width: "100%", marginTop: 18, borderRadius: 12, background: "#09070d" }} data-testid="video-approved-playback">{playback.subtitles?.map(s => <track key={s.id} kind="subtitles" src={s.url} srcLang={s.language} label={s.label} default={s.isDefault} />)}</video><p className="helper">This playback URL was returned by the FamilyFlix server. If it stops working, return to the title page to review its current rights information.</p></div> : <ErrorBox message="The server did not return a safe, approved media URL. Playback has been withheld." />}</Shell>;
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
    <form className="panel" onSubmit={submit}><span className="eyebrow">DemureGram account</span><h2 style={{ marginTop: 12 }}>{signup ? "Create your account" : "Sign in"}</h2>{signup && <div className={inputClass}><label htmlFor="auth-name">Name</label><input id="auth-name" required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" data-testid="input-auth-name" /></div>}<div className={inputClass} style={{ marginTop: 15 }}><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" data-testid="input-auth-email" /></div><div className={inputClass} style={{ marginTop: 15 }}><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" required minLength={signup ? 10 : undefined} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} data-testid="input-auth-password" /></div>{message && <p className="form-message error" role="alert" data-testid="status-auth-error">{message}</p>}<button className="button" disabled={pending} style={{ width: "100%", marginTop: 20 }} data-testid="button-auth-submit">{pending ? "Working…" : signup ? "Create account" : "Sign in"}</button><p className="helper" style={{ textAlign: "center", marginTop: 15 }}>{signup ? "Already a member? " : "New to DemureGram? "}<Link href={signup ? "/auth/sign-in" : "/auth/sign-up"} style={{ color: "hsl(19 83% 67%)" }}>{signup ? "Sign in" : "Create an account"}</Link></p></form></div></Shell>;
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
     about: { title:"DemureGram, with a catalog built around clarity.", desc:"FamilyFlix is DemureGram’s film and television catalog.", parts:["DemureGram is the public platform brand. FamilyFlix is its catalog for discovering films and television titles whose rights have been reviewed for inclusion. Each title page shows available attribution, license and limitations before playback.","FamilyFlix is not the owner of third-party films. Creators, studios, distributors and other rights holders retain the rights they hold. A title is playable only when the server returns an approved media source.","Our catalog may be small or empty while rights evidence is reviewed. That is by design: no title should appear simply because someone uploaded it.","Copyright © 2026 DEMUREGRAM LLC — draft wording supplied for counsel review only. The legal entity and its relationship to the platform require confirmation before publication."] },
     contact: { title:"Contact & rights questions", desc:"Copyright reporting and catalog questions.", parts:["Copyright reports can be submitted through the copyright reporting form. Include clear information that enables a review.","Public copyright contact details appear below only when all required contact fields are configured.","A published contact record does not represent a legal determination or a claim that an agent registration is complete."] },
    terms: { title:"Terms of use", desc:"Draft language — for attorney review.", parts:["This page is a product draft and is not legal advice or a final agreement. DemureGram must obtain legal review and publish approved terms before relying on this language.","FamilyFlix lists titles and rights information provided for review. Listing a third-party work does not assert ownership. Availability and permissions may be limited by territory, time or license conditions.","Users should not submit content or information they do not have authority to provide. Copyright notices and counter-notices must be truthful and complete. Applicable procedures and deadlines require counsel review."] },
     "repeat-infringer-policy": { title:"Repeat-infringer policy", desc:"Draft policy — for attorney review.", parts:["This policy is a product draft and must be reviewed by counsel before publication or enforcement.","A complaint is an allegation, not a confirmed strike. Staff must review the evidence, record the basis for a finding, and preserve the case history. Counter-notices do not automatically restore content or erase a prior decision.","Where repeated infringement is confirmed, DemureGram may restrict or terminate access after appropriate review and notice. The platform does not apply automatic penalties solely from the number of unreviewed complaints.","Counsel must confirm the applicable notice process, repeat-infringer criteria, appeal steps, retention period, and legal contact details before this policy is relied on."] },
    privacy: { title:"Privacy notice", desc:"Draft language — for attorney review.", parts:["This page is a product draft and requires attorney review. It does not make a complete statement of data practices.","Account, preference and submission information may be processed to operate DemureGram and the FamilyFlix catalog. The actual retention, security, sharing and deletion practices must be confirmed by the platform operator.","Do not provide more personal information in a copyright notice than is required for the applicable process. No privacy contact details are published here unless configured."] },
  };
  const pageInfo = text[page] || text.about;
   return <Shell><Heading eyebrow={`DemureGram / ${page}`} title={pageInfo.title} description={pageInfo.desc} />
     {(page === "terms" || page === "privacy" || page === "repeat-infringer-policy") && <div className="status warn" data-testid="status-legal-draft">Draft — for attorney review</div>}
     <article className="legal-copy">{pageInfo.parts.map((p,i)=><p key={i}>{p}</p>)}{page==="contact" && <><h2>Copyright reporting</h2><p>Use the <Link href="/copyright/report" style={{ color:"hsl(19 83% 67%)" }} data-testid="link-contact-copyright-report">copyright report form</Link> to submit a formal notice. Counter-notices can be submitted using the case-specific link provided in the relevant case communication.</p></>}</article>
     {page==="contact" && (config.data?.copyrightContact ? <div className="panel" style={{marginTop:20}} data-testid="public-copyright-contact"><h2>Copyright contact</h2><p>{config.data.copyrightContact.name}</p><p><a href={`mailto:${config.data.copyrightContact.email}`}>{config.data.copyrightContact.email}</a></p><address style={{fontStyle:"normal",whiteSpace:"pre-wrap"}}>{config.data.copyrightContact.address}</address></div> : <div className="notice" style={{marginTop:20}} data-testid="status-copyright-contact-unconfigured"><Info size={17}/><span>Copyright contact details are not configured. This site does not publish an address, phone number, email or agent identity unless the operator supplies verified details.</span></div>)}
  </Shell>;
}
function AdminOverview() {
  const dashboard = useGetAdminDashboard();
  const health = useHealthCheck();
  return <Shell admin><div><Heading eyebrow="Studio / overview" title="Catalog operations" description="A rights-first view of the FamilyFlix catalog within DemureGram." />
    {dashboard.isLoading ? <div className="metric-grid">{[0,1,2,3].map(i=><div className="skeleton" key={i} />)}</div> : dashboard.isError ? <ErrorBox message={errorText(dashboard.error)} retry={()=>dashboard.refetch()} /> : <div className="metric-grid">
      {[["Published titles",dashboard.data?.publishedTitles],["Rights awaiting review",dashboard.data?.pendingRights],["Open copyright cases",dashboard.data?.openCases],["Repeat infringer records",dashboard.data?.repeatInfringers]].map(([label,value])=><div className="metric" key={String(label)} data-testid={`metric-${String(label).toLowerCase().replaceAll(" ","-")}`}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}
    </div>}
    <div className="panel" style={{ marginTop: 20 }}><h2>Readiness</h2><div className="feature-line" data-testid="status-api-health"><span className={`status ${health.data?.status==="ok"?"good":"warn"}`}>{health.isLoading?"Checking":health.data?.status || (health.isError?"Unavailable":"Unknown")}</span> API connection</div><p className="helper" style={{ marginTop: 10 }}>A public title is only playable when a server-approved source is returned. Rights evidence and case decisions remain available in the audit trail.</p></div>
  </div></Shell>;
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
    <h2 style={{marginTop:28}}>Rights evidence</h2><p className="helper">Do not use torrent or magnet links as playback or source media. Provide rights documentation and license details from the relevant rights holder.</p>
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
  const publishReady=mainVideoCount===1&&!!t.rights?.length&&t.rights.every(r=>r.reviewStatus==="approved")&&t.streamStatus==="ready";
  return <Shell admin><div><Heading eyebrow="Studio / rights record" title={t.name} description={`/${t.slug} · ${t.kind}`} action={<div className="form-actions" style={{marginTop:0}}><button className="button" disabled={!publishReady||publish.isPending} onClick={()=>publish.mutate({id},{onSuccess:()=>{refresh();setMessage("Title published to the approved catalog.");},onError:e=>setMessage(errorText(e))})} data-testid="button-publish-title">{publish.isPending?"Publishing…":"Publish to catalog"}</button><button className="button-danger" onClick={()=>{if(confirm("Archive this title?"))remove.mutate({id},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListAdminTitlesQueryKey()});setMessage("Title archived.");},onError:e=>setMessage(errorText(e))});}} data-testid="button-archive-title">Archive title</button></div>}/>
    {mainVideoCount!==1&&<p className="form-message error" role="status">Exactly one main-video rights record is required before publication. Current count: {mainVideoCount}.</p>}
    <div className="metric-grid"><div className="metric"><span>Publication state</span><strong style={{fontSize:17}}>{t.status}</strong></div><div className="metric"><span>Stream</span><strong style={{fontSize:17}}>{t.streamStatus}</strong></div><div className="metric"><span>Rights records</span><strong>{t.rights?.length??0}</strong></div><div className="metric"><span>Created</span><strong style={{fontSize:17}}>{stamp(t.createdAt)}</strong></div></div>
    <form className="panel" style={{marginTop:18}} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);update.mutate({id,data:{name:String(f.get("name")),synopsis:String(f.get("synopsis"))}},{onSuccess:()=>{refresh();setMessage("Title metadata saved.");},onError:e=>setMessage(errorText(e))});}}><h2>Title metadata</h2><div className="field-grid"><div className="field"><label>Name</label><input name="name" required defaultValue={t.name} data-testid="input-edit-title-name"/></div><div className="field full"><label>Synopsis</label><textarea name="synopsis" defaultValue={t.synopsis} data-testid="input-edit-title-synopsis"/></div></div><div className="form-actions"><button className="button-secondary" disabled={update.isPending} data-testid="button-update-title">{update.isPending?"Saving…":"Save title details"}</button></div></form>
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
  const qc=useQueryClient(); const mutation=useImportTitles(); const [text,setText]=useState(""); const [format,setFormat]=useState<"csv"|"json">("csv"); const [dryRun,setDryRun]=useState(true); const [updateExisting,setUpdateExisting]=useState(false); const [attest,setAttest]=useState(false); const [report,setReport]=useState<import("@workspace/api-client-react").ImportReport|null>(null); const [message,setMessage]=useState("");
   const csvHeader="name,kind,synopsis,year,creatorAttribution,assetLabel,assetUrl,rightsHolder,rightsCreatorAttribution,licenseType,licenseVersion,licenseUrl,usageRestrictions,sourceUrl,evidenceUrl,evidenceNotes,territory,expiresAt,mp4Url,hlsUrl";
  function download(){const blob=new Blob([format==="csv"?csvHeader+"\n":"[]"],{type:format==="csv"?"text/csv":"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=`familyflix-template.${format}`;a.click();URL.revokeObjectURL(u);}
  function run(){setMessage("");mutation.mutate({data:{format:format as ImportInputFormat,payload:text,dryRun,updateExisting,uploaderAttested:true}},{onSuccess:r=>{setReport(r);if(!dryRun)qc.invalidateQueries({queryKey:getListAdminTitlesQueryKey()});},onError:e=>setMessage(errorText(e))});}
  return <Shell admin><div><Heading eyebrow="Studio / import" title="Import titles" description="Validate a CSV or JSON payload before making changes. Every record needs truthful rights evidence; imports never bypass review." />
    <div className="notice" style={{marginBottom:16}}><ShieldCheck size={17}/><span>Start with a dry run. Import data remains subject to rights approval. Never submit unauthorized streams, magnet links or torrent references.</span></div>
    <div className="panel"><div className="form-actions" style={{marginTop:0,marginBottom:15}}><button className={format==="csv"?"button":"button-secondary"} onClick={()=>setFormat("csv")} data-testid="button-format-csv">CSV</button><button className={format==="json"?"button":"button-secondary"} onClick={()=>setFormat("json")} data-testid="button-format-json">JSON</button><button className="button-secondary" onClick={download} data-testid="button-download-template">Download blank template</button><label className="button-secondary" style={{cursor:"pointer"}}>Load file<input type="file" accept=".csv,.json,application/json,text/csv" hidden onChange={e=>{const file=e.target.files?.[0];if(file){setFormat(file.name.endsWith(".json")?"json":"csv");file.text().then(setText);setReport(null);}}} data-testid="input-import-file"/></label></div>
      <div className="field"><label>Import payload</label><textarea rows={12} value={text} onChange={e=>{setText(e.target.value);setReport(null);}} spellCheck={false} placeholder={format==="csv"?csvHeader+"\n":"[]"} data-testid="input-import-payload"/></div>
      <div className="field-grid" style={{marginTop:14}}><label className="helper"><input type="checkbox" checked={dryRun} onChange={e=>{setDryRun(e.target.checked);setReport(null);}} data-testid="input-import-dryrun"/> Validate only (dry run)</label><label className="helper"><input type="checkbox" checked={updateExisting} onChange={e=>setUpdateExisting(e.target.checked)} data-testid="input-import-update"/> Update matching titles</label></div>
      {!dryRun&&<label className="notice" style={{marginTop:14}}><input type="checkbox" checked={attest} onChange={e=>setAttest(e.target.checked)} data-testid="input-import-attest"/> I confirm I am authorized to submit these titles and all associated rights evidence.</label>}
      {message&&<p className="form-message error" role="alert" data-testid="status-import-error">{message}</p>}
      <div className="form-actions"><button className="button" disabled={mutation.isPending||!text.trim()||(!dryRun&&!attest)} onClick={run} data-testid="button-run-import">{mutation.isPending?"Validating…":dryRun?"Validate payload":"Import titles"}</button><button className="button-secondary" onClick={()=>{setText("");setReport(null);setMessage("");}} data-testid="button-clear-import">Clear</button><span className="helper">No records are created during a dry run.</span></div>
      {report&&<div className="panel" style={{marginTop:20}} data-testid="status-import-report"><h2>{report.dryRun?"Validation report":"Import report"}</h2><div className="metric-grid"><div className="metric"><span>Total</span><strong>{report.total}</strong></div><div className="metric"><span>Created</span><strong>{report.created}</strong></div><div className="metric"><span>Updated</span><strong>{report.updated}</strong></div><div className="metric"><span>Skipped</span><strong>{report.skipped}</strong></div></div>{report.pendingReview!==undefined&&<p className="helper">Pending review: {report.pendingReview}</p>}{report.issues?.length>0&&<div className="table-wrap"><table className="data-table"><thead><tr><th>Row</th><th>Title</th><th>Issue</th></tr></thead><tbody>{report.issues.map((i,n)=><tr key={`${i.row}-${n}`}><td>{i.row}</td><td>{i.title||"Not identified"}</td><td>{i.message}</td></tr>)}</tbody></table></div>}</div>}
    </div>
  </div></Shell>;
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
  const qc=useQueryClient(); const q=useGetCopyrightCase(id,{query:{enabled:!!id,queryKey:getGetCopyrightCaseQueryKey(id)}}); const decide=useDecideCopyrightCase(); const [message,setMessage]=useState("");
  if(q.isLoading)return <Shell admin><div className="skeleton" style={{height:260}}/></Shell>;
  if(q.isError||!q.data)return <Shell admin><div><Heading eyebrow="Studio / copyright" title="Case review"/><ErrorBox message={q.isError?errorText(q.error):"Case not found."} retry={()=>q.refetch()}/></div></Shell>;
  const c=q.data;
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);decide.mutate({id,data:{decision:String(f.get("decision")) as import("@workspace/api-client-react").CaseDecision["decision"],note:String(f.get("note")),recordRepeatInfringer:f.get("recordRepeat")==="on"}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetCopyrightCaseQueryKey(id)});qc.invalidateQueries({queryKey:getListCopyrightCasesQueryKey()});qc.invalidateQueries({queryKey:getGetAdminDashboardQueryKey()});setMessage("Decision and case history recorded.");},onError:e=>setMessage(errorText(e))});}
  return <Shell admin><div><Heading eyebrow={`Studio / case ${c.caseNumber}`} title="Case history" description={`${c.caseType==="copyright-report"?"Copyright report":"Counter-notice"} · Submitted ${stamp(c.submittedAt)}`} />
     <div className="panel"><div className="feature-line"><span className={`status ${c.status==="closed"||c.status==="resolved"?"good":"warn"}`} data-testid="status-case-detail">{c.status}</span><span>Reporter: {c.reporterName}</span></div><h2 style={{marginTop:16}}>{c.summary}</h2><div className="helper wrap">Reporter email: {c.reporterEmail}</div>{c.caseType==="copyright-report"&&<div className="notice" style={{marginTop:16}}><Info size={17}/><span>For a counter-notice, send the case-specific form through your approved communication process. This app does not send case emails.</span><Link href={`/copyright/counter-notice/${encodeURIComponent(c.caseNumber)}`} className="button-secondary" data-testid="link-admin-counter-notice">Open counter-notice form</Link></div>}<details style={{marginTop:18}}><summary className="helper" style={{cursor:"pointer"}}>Submitted details (sensitive)</summary><pre className="helper wrap" style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(c.payload,null,2)}</pre></details></div>
    <div className="panel"><h2>Event history</h2>{c.events?.length?c.events.map(ev=><div className="rights-row" key={ev.id} data-testid={`row-case-event-${ev.id}`}><div><strong>{ev.eventType}</strong><p>{ev.note}</p></div><div className="helper">{ev.actorName}<br/>{stamp(ev.createdAt)}</div></div>):<Empty title="No recorded events">Case decisions and communications will be captured here.</Empty>}</div>
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
function AppRoutes() {
  return <Switch>
    <Route path="/" component={()=> <Catalog home/>}/>
    <Route path="/movies" component={()=> <Catalog kind="movie"/>}/>
    <Route path="/tv-shows" component={()=> <Catalog kind="series"/>}/>
    <Route path="/search" component={SearchPage}/>
    <Route path="/title/:slug">{p=>p?<DetailPage slug={p.slug}/>:null}</Route>
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
    <Route path="/admin" component={()=> <AdminGate><AdminOverview/></AdminGate>}/>
    <Route path="/admin/library" component={()=> <AdminGate><AdminLibrary/></AdminGate>}/>
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
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return <Router base={base}><AppRoutes/></Router>;
}
