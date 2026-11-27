import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  User,
  Shield,
  KeyRound,
  Trash2,
  Clock,
  Bookmark,
  Sparkles,
  Check,
  AlertTriangle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  X,
  Download,
  Bot,
  BadgeCheck,
  Volume2,
  CalendarCheck,
} from "lucide-react";
import { useProfile, type TubiProfile } from "@/lib/profile-context";
import { authClient } from "@/lib/auth-client";
import { useSubscription } from "@/lib/subscription-context";
import { AvatarPickerModal } from "@/components/familyflix/avatar-picker-modal";
import { HUMAN_VOICES } from "./ai-assistant-modal";
import { clearAllWatchProgress } from "@/components/familyflix/continue-watching-row";
import { cn } from "@/lib/utils";

export function AccountSettingsPage() {
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { id?: string; name?: string; email?: string; role?: string } } | null | undefined;
  const user = session?.user;
  const { profiles, activeProfile, switchProfile, deleteProfile } = useProfile();
  const {
    isSubscribed,
    openSubscriptionModal,
    offlineDownloads,
    removeDownload,
    preOrders,
    voiceChatEnabled,
    setVoiceChatEnabled,
    humanVoice,
    setHumanVoice,
  } = useSubscription();

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const handlePreviewVoice = (voiceId: string, name: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setHumanVoice(voiceId);
    setPlayingVoiceId(voiceId);

    const text = `Hi, I'm ${name}! Ready to explore the best movies on FamilyFlix with you.`;
    const audio = new Audio(`/api/ai/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`);
    previewAudioRef.current = audio;
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => setPlayingVoiceId(null);
    audio.play().catch(() => setPlayingVoiceId(null));
  };

  // Settings tab: "profiles" | "vip" | "downloads" | "security" | "history" | "privacy"
  const [activeTab, setActiveTab] = useState<"profiles" | "vip" | "downloads" | "security" | "history" | "privacy">("profiles");

  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Clear states
  const [historyCleared, setHistoryCleared] = useState(false);
  const [watchlistCleared, setWatchlistCleared] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 10) {
      setPasswordStatus({ type: "error", message: "New password must be at least 10 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      // Better auth change password
      await authClient.changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        revokeOtherSessions: true,
      });
      setPasswordStatus({ type: "success", message: "Password updated successfully!" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordStatus({
        type: "error",
        message: err?.message || "Failed to update password. Please check your current password.",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleClearHistory() {
    clearAllWatchProgress(activeProfile.id);
    setHistoryCleared(true);
    setTimeout(() => setHistoryCleared(false), 3000);
  }

  function handleClearWatchlist() {
    try {
      localStorage.removeItem("ff-list");
      localStorage.removeItem(`ff_watchlist_${activeProfile.id}`);
      setWatchlistCleared(true);
      setTimeout(() => setWatchlistCleared(false), 3000);
    } catch {}
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "DELETE") return;
    setDeleteLoading(true);
    try {
      // Clear all local records
      localStorage.clear();
      // Call server account deletion endpoint
      await fetch("/api/user/account", { method: "DELETE" }).catch(() => {});
      await authClient.signOut({});
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Manage your viewer profiles, sign-in credentials, viewing preferences, and privacy controls.
        </p>
      </div>

      {/* Account Info Pill */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div
            className="grid size-14 place-items-center rounded-2xl shadow-lg overflow-hidden border border-white/10"
            style={{ background: activeProfile.avatarColor }}
          >
            {activeProfile.avatar ? (
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <User className="size-7 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                {user?.name || activeProfile.name}
                {isSubscribed && (
                  <span
                    className="grid size-4 place-items-center rounded-full bg-amber-400 text-black shadow-sm"
                    title="Verified VIP Member"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                )}
              </h2>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
                {user?.role === "admin"
                  ? "Administrator"
                  : user?.role === "moderator"
                  ? "Moderator"
                  : isSubscribed
                  ? "VIP Member"
                  : "Viewer"}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {user?.email || "Guest Viewer Account (Local Session)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAvatarPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-600/20 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition shadow-sm"
          >
            <Sparkles size={14} />
            <span>Customize 3D Avatar</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut({});
                window.location.href = "/";
              }}
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/auth/sign-in"
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              Sign In or Create Account
            </Link>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 mb-6 gap-2 sm:gap-6 overflow-x-auto pb-px">
        {[
          { id: "profiles", label: "Profiles (Up to 6)", icon: User },
          { id: "vip", label: "VIP & Subscription", icon: Sparkles },
          { id: "downloads", label: "Offline Downloads", icon: Download },
          { id: "security", label: "Security & Password", icon: KeyRound },
          { id: "history", label: "Watch History & List", icon: Clock },
          { id: "privacy", label: "Privacy & GDPR", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-xs sm:text-sm font-bold transition whitespace-nowrap",
                isActive
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/20"
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: PROFILES */}
      {activeTab === "profiles" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Active Profiles</h3>
                <p className="text-xs text-white/50">
                  Support up to 6 custom viewing profiles with independent watch history and Kids Mode locks.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                {profiles.length} / 6 Profiles
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {profiles.map((p) => {
                const isSelected = p.id === activeProfile.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border p-4 transition",
                      isSelected
                        ? "border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="grid size-10 shrink-0 place-items-center rounded-xl shadow-md text-white font-bold overflow-hidden"
                        style={{ background: p.avatarColor }}
                      >
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : p.isKids ? (
                          <Sparkles size={16} />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-white">{p.name}</p>
                          {p.isKids && (
                            <span className="rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black uppercase text-black">
                              Kids
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40">
                          {isSelected ? "Currently Active" : "Click to Switch"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => switchProfile(p.id)}
                          className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition"
                        >
                          Switch
                        </button>
                      )}
                      {p.id !== "profile-guest" && p.id !== "profile-kids" && (
                        <button
                          type="button"
                          onClick={() => deleteProfile(p.id)}
                          className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400 transition"
                          title="Delete profile"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VIP & SUBSCRIPTION */}
      {activeTab === "vip" && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#181b20] to-[#12161b] p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                  <Sparkles size={13} /> Membership Status
                </span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  {isSubscribed ? "FamilyFlix VIP Premium" : "Free Ad-Supported (AVOD)"}
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  {isSubscribed
                    ? "Full VIP perks active: No commercial ads, uncapped 4K streaming, and offline playback."
                    : "Upgrade to remove all commercial ad breaks, unlock 4K Ultra-HD, and download titles."}
                </p>
              </div>
              <div className="hidden sm:block">
                {isSubscribed ? (
                  <div className="grid size-14 place-items-center rounded-2xl bg-amber-400 text-black shadow-lg">
                    <BadgeCheck size={32} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
                  >
                    Upgrade to VIP
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 pt-6 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>Ad-Free Streaming (100% no pre-rolls)</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>Uncapped 4K Ultra-HD Streaming</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>Save to Device (Offline Mode)</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>Pre-Order Upcoming Movies & TV Shows</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>Golden Verified Member Checkmark</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Check size={16} className="text-emerald-400" />
                <span>3D Human Avatars & Cinema Covers</span>
              </div>
            </div>

            {!isSubscribed && (
              <button
                type="button"
                onClick={openSubscriptionModal}
                className="mt-6 flex w-full sm:hidden items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-xs font-bold text-white"
              >
                <Sparkles size={14} /> Upgrade to VIP Membership
              </button>
            )}
          </div>

          {/* Voice Assistant Settings */}
          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Volume2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Voice Assistant (Natural Human Speech)</h4>
                  <p className="text-xs text-white/50">Hear movie recommendations spoken in real, high-definition human voices (zero robotic synthesizers)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceChatEnabled}
                  onChange={(e) => setVoiceChatEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Human Voice Selection Grid */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">Select Preferred Human Voice:</span>
                <span className="text-[10px] text-purple-300 font-medium">100% Human Audio Stream</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {HUMAN_VOICES.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setHumanVoice(v.id)}
                    className={`flex items-center justify-between rounded-2xl border p-3 cursor-pointer transition ${
                      humanVoice === v.id
                        ? "border-purple-500 bg-purple-600/20 shadow-md shadow-purple-600/20"
                        : "border-white/10 bg-black/40 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{v.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{v.name}</span>
                          {humanVoice === v.id && (
                            <span className="rounded-full bg-purple-500 px-1.5 py-0.2 text-[8px] font-black uppercase text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight mt-0.5">{v.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(v.id, v.name);
                      }}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                        playingVoiceId === v.id
                          ? "bg-emerald-500 text-white animate-pulse"
                          : "bg-white/10 text-white/80 hover:bg-purple-600 hover:text-white"
                      }`}
                    >
                      {playingVoiceId === v.id ? "Playing..." : "Preview"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-ordered Titles List */}
          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck size={18} className="text-amber-400" />
              <h4 className="text-sm font-bold text-white">Reserved Early-Access Titles ({preOrders.length})</h4>
            </div>
            {preOrders.length > 0 ? (
              <div className="space-y-2">
                {preOrders.map((slug) => (
                  <div key={slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3">
                    <span className="text-xs font-semibold text-white capitalize">{slug.replace(/-/g, " ")}</span>
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                      Early Access Reserved ✓
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50">You haven't reserved any upcoming titles yet. Browse the catalog to pre-order titles for early access.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: OFFLINE DOWNLOADS */}
      {activeTab === "downloads" && (
        <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div>
              <h3 className="text-base font-bold text-white">Offline Downloads ({offlineDownloads.length})</h3>
              <p className="text-xs text-white/50">Titles saved to your device for offline streaming without internet.</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              Offline Ready
            </span>
          </div>

          {offlineDownloads.length > 0 ? (
            <div className="space-y-3">
              {offlineDownloads.map((item) => (
                <div
                  key={`${item.slug}-${item.episodeId || "movie"}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.name} className="size-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="grid size-12 place-items-center rounded-xl bg-purple-900/40 text-purple-300 shrink-0">
                        <Download size={20} />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-white/50">{item.episodeName || "Feature Presentation"} · {item.size}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={item.episodeId ? `/watch/${item.slug}/${item.episodeId}` : `/watch/${item.slug}`}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                    >
                      Play Offline
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeDownload(item.slug, item.episodeId)}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400"
                      title="Delete offline file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Download size={32} className="mx-auto text-white/20 mb-2" />
              <p className="text-xs text-white/50">No titles downloaded yet. Use the "Save to Device" button on any movie or TV episode.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl max-w-xl">
          <h3 className="text-base font-bold text-white mb-1">Change Password</h3>
          <p className="text-xs text-white/50 mb-6">
            Update your account password. Must be at least 10 characters long.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                New Password (10+ characters)
              </label>
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>

            {passwordStatus && (
              <div
                className={cn(
                  "rounded-xl p-3 text-xs font-semibold",
                  passwordStatus.type === "success"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                )}
              >
                {passwordStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: WATCH HISTORY & WATCHLIST */}
      {activeTab === "history" && (
        <div className="space-y-6 max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Continue Watching History</h3>
            <p className="text-xs text-white/50 mb-4">
              Clear your viewing history and resume timestamps for this profile.
            </p>
            <button
              type="button"
              onClick={handleClearHistory}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition"
            >
              {historyCleared ? "✓ History Cleared" : "Clear Continue Watching"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Personalized Watchlist</h3>
            <p className="text-xs text-white/50 mb-4">
              Remove all saved titles from your personalized My List.
            </p>
            <button
              type="button"
              onClick={handleClearWatchlist}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition"
            >
              {watchlistCleared ? "✓ Watchlist Cleared" : "Clear My List"}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRIVACY & GDPR */}
      {activeTab === "privacy" && (
        <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-xl max-w-xl">
          <h3 className="text-base font-bold text-white mb-1">Data Rights & Account Deletion</h3>
          <p className="text-xs text-white/50 mb-6">
            Under GDPR and CCPA regulations, you have the right to request the permanent deletion of your account and associated viewer data.
          </p>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-300">Permanent Action</h4>
                <p className="text-[11px] text-white/60 mt-1">
                  Deleting your account removes all custom profiles, watch history, saved watchlist entries, and preferences. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-600/20 border border-rose-500/40 px-5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition shadow-lg shadow-rose-900/20"
          >
            <Trash2 size={14} />
            <span>Delete Account (GDPR / CCPA)</span>
          </button>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#180f1d] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-black text-white">Delete Account?</h3>
            </div>

            <p className="text-xs text-white/70 mb-4">
              To confirm permanent deletion of your account and data, type <strong className="text-rose-400">DELETE</strong> below:
            </p>

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl border border-rose-500/30 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-rose-400 mb-4"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== "DELETE" || deleteLoading}
                onClick={handleDeleteAccount}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <AvatarPickerModal isOpen={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} />
    </div>
  );
}
