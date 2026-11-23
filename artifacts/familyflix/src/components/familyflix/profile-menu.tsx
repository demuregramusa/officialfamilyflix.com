import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  User,
  Sparkles,
  Rocket,
  Heart,
  Film,
  Smile,
  Plus,
  Check,
  ShieldAlert,
  Bookmark,
  LogOut,
  LogIn,
  ChevronDown,
  X,
  Settings,
  Shield,
  Bot,
  BadgeCheck,
} from "lucide-react";
import { useProfile, type TubiProfile } from "@/lib/profile-context";
import { authClient } from "@/lib/auth-client";
import { useSubscription } from "@/lib/subscription-context";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { id: "purple", label: "Purple Nebula", bg: "linear-gradient(135deg, #7c3aed, #4f46e5)" },
  { id: "amber", label: "Sunset Coral", bg: "linear-gradient(135deg, #f59e0b, #ec4899)" },
  { id: "blue", label: "Ocean Blue", bg: "linear-gradient(135deg, #06b6d4, #3b82f6)" },
  { id: "emerald", label: "Emerald Mint", bg: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "rose", label: "Berry Rose", bg: "linear-gradient(135deg, #f43f5e, #be123c)" },
  { id: "orange", label: "Solar Flare", bg: "linear-gradient(135deg, #ea580c, #ca8a04)" },
];

const AVATAR_ICONS = [
  { id: "user", label: "User", Icon: User },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "rocket", label: "Rocket", Icon: Rocket },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "film", label: "Film", Icon: Film },
  { id: "smile", label: "Smile", Icon: Smile },
];

function ProfileIcon({ icon, className = "size-4 text-white" }: { icon: string; className?: string }) {
  const match = AVATAR_ICONS.find((i) => i.id === icon) || AVATAR_ICONS[0];
  const Component = match.Icon;
  return <Component className={className} />;
}

export function ProfileMenu({
  onOpenAvatarPicker,
  onOpenAIAssistant,
}: {
  onOpenAvatarPicker?: () => void;
  onOpenAIAssistant?: () => void;
}) {
  const { profiles, activeProfile, isKidsMode, switchProfile, createProfile, exitKidsMode } = useProfile();
  const { isVerified, isSubscribed, openSubscriptionModal } = useSubscription();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // New profile form state
  const [newName, setNewName] = useState("");
  const [newIsKids, setNewIsKids] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].bg);
  const [selectedIcon, setSelectedIcon] = useState("user");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { name?: string; email?: string; role?: string } } | null | undefined;
  const user = session?.user;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createProfile({
      name: newName.trim(),
      isKids: newIsKids,
      avatarColor: selectedColor,
      avatarIcon: selectedIcon,
      avatar: newIsKids ? "/avatars/kids/kid-1.png" : "/avatars/adults/adult-1.png",
    });
    setNewName("");
    setNewIsKids(false);
    setModalOpen(false);
    setDropdownOpen(false);
  }

  function openCreateModal(defaultKids = false) {
    setNewName(defaultKids ? "Kids" : "");
    setNewIsKids(defaultKids);
    setSelectedColor(defaultKids ? AVATAR_COLORS[1].bg : AVATAR_COLORS[0].bg);
    setSelectedIcon(defaultKids ? "sparkles" : "user");
    setModalOpen(true);
    setDropdownOpen(false);
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Profile Pill Trigger Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold text-white transition hover:scale-105 active:scale-95",
            isKidsMode
              ? "border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-purple-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              : "border-white/15 bg-white/[0.06] hover:border-white/30 hover:bg-white/[0.12]"
          )}
          aria-label="Manage profiles"
          data-testid="button-profile-menu"
        >
          {/* Avatar Icon */}
          <div
            className="grid size-6 place-items-center rounded-full shadow-inner overflow-hidden"
            style={{ background: activeProfile.avatarColor }}
          >
            {activeProfile.avatar ? (
              <img
                src={activeProfile.avatar}
                alt="Avatar"
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <ProfileIcon icon={activeProfile.avatarIcon} className="size-3.5 text-white" />
            )}
          </div>
          <span className="max-w-[90px] truncate text-white/90 sm:max-w-[120px]">
            {user?.name || activeProfile.name}
          </span>
          {isVerified && (
            <span
              className="grid size-4 place-items-center rounded-full bg-amber-400 text-black shadow-sm shrink-0"
              title="Verified VIP Member"
            >
              <Check className="size-2.5 stroke-[3]" />
            </span>
          )}
          {isKidsMode ? (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[9px] font-black uppercase text-black">
              Kids
            </span>
          ) : null}
          <ChevronDown className="size-3 text-white/50" />
        </button>

        {/* Dropdown Popover */}
        {dropdownOpen ? (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/15 bg-[#120e1d]/95 p-3 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in">
            {/* Popover Header */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Who's Watching?
              </span>
              {isKidsMode ? (
                <button
                  type="button"
                  onClick={() => {
                    exitKidsMode();
                    setDropdownOpen(false);
                  }}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-white/20"
                >
                  Exit Kids
                </button>
              ) : null}
            </div>

            {/* Profiles List */}
            <div className="mt-2 space-y-1">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      switchProfile(p.id);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition",
                      isActive
                        ? "bg-white/15 font-bold text-white shadow-sm"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="grid size-7 shrink-0 place-items-center rounded-full shadow-md overflow-hidden"
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
                        ) : (
                          <ProfileIcon icon={p.avatarIcon} className="size-4 text-white" />
                        )}
                      </div>
                      <span className="truncate">{p.name}</span>
                      {p.isKids ? (
                        <span className="shrink-0 rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black uppercase text-black">
                          Kids
                        </span>
                      ) : null}
                    </div>
                    {isActive ? <Check className="size-4 text-purple-400" /> : null}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
              {profiles.length < 6 ? (
                <>
                  <button
                    type="button"
                    onClick={() => openCreateModal(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
                  >
                    <Sparkles className="size-4 text-amber-400" />
                    <span>Create Kids Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateModal(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <Plus className="size-4 text-white/60" />
                    <span>Add Profile ({profiles.length}/6)</span>
                  </button>
                </>
              ) : (
                <div className="px-3 py-1.5 text-[11px] text-white/40 italic">
                  Maximum of 6 profiles reached
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onOpenAvatarPicker) onOpenAvatarPicker();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-pink-300 transition hover:bg-pink-500/10"
              >
                <Sparkles className="size-4 text-pink-400" />
                <span>Customize 3D Avatar & Cover</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  openSubscriptionModal();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
              >
                <BadgeCheck className="size-4 text-amber-400" />
                <span>
                  {isSubscribed ? "VIP Membership (Active)" : "Unlock VIP (Ad-Free & 4K)"}
                </span>
              </button>

              <Link
                href="/my-list"
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Bookmark className="size-4 text-white/60" />
                <span>My List</span>
              </Link>

              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Settings className="size-4 text-white/60" />
                <span>Account & Settings</span>
              </Link>

              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-500/20"
                >
                  <Shield className="size-4 text-purple-400" />
                  <span>Admin Studio & CMS</span>
                </Link>
              )}

              {user?.role === "moderator" && (
                <Link
                  href="/admin/moderation"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                >
                  <Shield className="size-4 text-amber-400" />
                  <span>Moderator Queue</span>
                </Link>
              )}
            </div>

            {/* Account / Sign In / Sign Out */}
            <div className="mt-2 pt-2 border-t border-white/10">
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut({});
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10"
                >
                  <LogOut className="size-4 text-rose-400" />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link
                  href="/auth/sign-in"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/10"
                >
                  <LogIn className="size-4 text-purple-400" />
                  <span>Sign in / Create Account</span>
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* -------------------- TUBI CREATE PROFILE MODAL -------------------- */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#140f22] p-6 shadow-2xl">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className="grid size-12 place-items-center rounded-2xl shadow-lg"
                style={{ background: selectedColor }}
              >
                <ProfileIcon icon={selectedIcon} className="size-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Create Profile</h3>
                <p className="text-xs text-white/50">Customize viewing preferences and age settings</p>
              </div>
            </div>

            <form onSubmit={handleCreateProfile} className="mt-6 space-y-5">
              {/* Profile Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kids, Alex, Family Room"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>

              {/* Kids Mode Toggle */}
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-amber-300">Tubi Kids Mode</span>
                    <span className="rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black uppercase text-black">
                      Safe
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    Only shows family-friendly movies, animation, and TV-Y / PG content. Automatically hides mature titles.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={newIsKids}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setNewIsKids(next);
                      if (next) {
                        setSelectedColor(AVATAR_COLORS[1].bg);
                        setSelectedIcon("sparkles");
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full peer-checked:after:bg-black" />
                </label>
              </div>

              {/* Avatar Color Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Avatar Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_COLORS.map((col) => {
                    const isSelected = selectedColor === col.bg;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedColor(col.bg)}
                        aria-label={col.label}
                        className={cn(
                          "relative aspect-square rounded-xl shadow-md transition hover:scale-110 active:scale-95",
                          isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#140f22]" : "opacity-80"
                        )}
                        style={{ background: col.bg }}
                      >
                        {isSelected ? (
                          <div className="grid h-full place-items-center">
                            <Check className="size-4 text-white drop-shadow" />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Icon Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Avatar Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.id;
                    const IconComp = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        aria-label={item.label}
                        className={cn(
                          "grid aspect-square place-items-center rounded-xl border transition hover:scale-105 active:scale-95",
                          isSelected
                            ? "border-purple-400 bg-purple-500/20 text-purple-300"
                            : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                        )}
                      >
                        <IconComp className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:brightness-110 active:scale-95"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
