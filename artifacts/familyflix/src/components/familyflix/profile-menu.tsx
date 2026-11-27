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
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
              Kids
            </span>
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 text-white/50" />
        </button>

        {/* Dropdown Popover */}
        {dropdownOpen ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-[288px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#12161b]/95 p-2.5 font-sans shadow-2xl backdrop-blur-2xl animate-fade-in">
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8a8a8]">
                Who&apos;s Watching?
              </span>
              {isKidsMode ? (
                <button
                  type="button"
                  onClick={() => {
                    exitKidsMode();
                    setDropdownOpen(false);
                  }}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 transition hover:bg-white/20"
                >
                  Exit Kids
                </button>
              ) : null}
            </div>

            {/* Profiles List */}
            <div className="mt-1.5 space-y-1">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile.id;
                const showKidsBadge =
                  p.isKids && p.name.trim().toLowerCase() !== "kids";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      switchProfile(p.id);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex h-11 w-full items-center justify-between gap-2.5 rounded-xl px-3 text-left text-[13px] font-medium leading-5 transition",
                      isActive
                        ? "bg-white/[0.12] text-[#f5f5f5]"
                        : "text-[#f5f5f5]/80 hover:bg-white/[0.07] hover:text-[#f5f5f5]"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex size-7 shrink-0 rounded-full p-[1.5px]",
                          isActive ? "demure-ring" : "bg-white/15"
                        )}
                      >
                        <div
                          className="grid size-full place-items-center overflow-hidden rounded-full border border-[#0c1014]"
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
                            <ProfileIcon icon={p.avatarIcon} className="size-3.5 text-white" />
                          )}
                        </div>
                      </span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {showKidsBadge || p.isKids ? (
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 border border-amber-400/30">
                          Safe
                        </span>
                      ) : null}
                      {isActive ? <Check className="size-4 shrink-0 text-[#00d2ff]" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-2 space-y-0.5 border-t border-white/[0.08] pt-2">
              {profiles.length < 6 ? (
                <>
                  <button
                    type="button"
                    onClick={() => openCreateModal(true)}
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-amber-300 transition hover:bg-amber-400/10"
                  >
                    <Sparkles className="size-4 shrink-0 text-amber-400" />
                    <span className="truncate">Create Kids Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateModal(false)}
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#f5f5f5]/85 transition hover:bg-white/[0.08] hover:text-[#f5f5f5]"
                  >
                    <Plus className="size-4 shrink-0 text-[#a8a8a8]" />
                    <span className="truncate">Add Profile ({profiles.length}/6)</span>
                  </button>
                </>
              ) : (
                <div className="px-3 py-2 text-[12px] font-normal text-[#a8a8a8]">
                  Maximum of 6 profiles reached
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onOpenAvatarPicker) onOpenAvatarPicker();
                }}
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#f5f5f5]/90 transition hover:bg-white/[0.08] hover:text-[#f5f5f5]"
              >
                <Sparkles className="size-4 shrink-0 text-[#d6249f]" />
                <span className="truncate">Customize 3D Avatar &amp; Cover</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  openSubscriptionModal();
                }}
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-amber-300 transition hover:bg-amber-400/10"
              >
                <BadgeCheck className="size-4 shrink-0 text-amber-400" />
                <span className="truncate">
                  {isSubscribed ? "VIP Membership (Active)" : "Unlock VIP (Ad-Free & 4K)"}
                </span>
              </button>

              <Link
                href="/my-list"
                onClick={() => setDropdownOpen(false)}
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#f5f5f5]/85 transition hover:bg-white/[0.08] hover:text-[#f5f5f5]"
              >
                <Bookmark className="size-4 shrink-0 text-[#a8a8a8]" />
                <span className="truncate">My List</span>
              </Link>

              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#f5f5f5]/85 transition hover:bg-white/[0.08] hover:text-[#f5f5f5]"
              >
                <Settings className="size-4 shrink-0 text-[#a8a8a8]" />
                <span className="truncate">Account &amp; Settings</span>
              </Link>

              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setDropdownOpen(false)}
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#00d2ff] transition hover:bg-[#0095f6]/15"
                >
                  <Shield className="size-4 shrink-0 text-[#0095f6]" />
                  <span className="truncate">Admin Studio &amp; CMS</span>
                </Link>
              )}

              {user?.role === "moderator" && (
                <Link
                  href="/admin/moderation"
                  onClick={() => setDropdownOpen(false)}
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-amber-300 transition hover:bg-amber-400/15"
                >
                  <Shield className="size-4 shrink-0 text-amber-400" />
                  <span className="truncate">Moderator Queue</span>
                </Link>
              )}
            </div>

            {/* Account / Sign In / Sign Out */}
            <div className="mt-2 border-t border-white/[0.08] pt-2">
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut({});
                    setDropdownOpen(false);
                  }}
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#ff6b78] transition hover:bg-[#ff3040]/10"
                >
                  <LogOut className="size-4 shrink-0 text-[#ff3040]" />
                  <span className="truncate">Sign out</span>
                </button>
              ) : (
                <Link
                  href="/auth/sign-in"
                  onClick={() => setDropdownOpen(false)}
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium leading-5 text-[#00d2ff] transition hover:bg-[#0095f6]/15"
                >
                  <LogIn className="size-4 shrink-0 text-[#0095f6]" />
                  <span className="truncate">Sign in / Create Account</span>
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* -------------------- TUBI CREATE PROFILE MODAL -------------------- */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1014]/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#12161b] p-6 shadow-2xl">
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
                <h3 className="text-xl font-bold text-[#f5f5f5]">Create Profile</h3>
                <p className="text-xs text-[#a8a8a8]">Customize viewing preferences and age settings</p>
              </div>
            </div>

            <form onSubmit={handleCreateProfile} className="mt-6 space-y-5">
              {/* Profile Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#a8a8a8]">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kids, Alex, Family Room"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-[#0c1014] px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-white/30 outline-none transition focus:border-[#0095f6] focus:ring-1 focus:ring-[#0095f6]"
                />
              </div>

              {/* Kids Mode Toggle */}
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-amber-300">Kids Mode</span>
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase text-black">
                      Safe
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    Only shows family-friendly movies, animation, and TV-Y / PG content. Automatically hides mature titles.
                  </p>
                </div>
                <label className="relative mt-1 inline-flex shrink-0 cursor-pointer items-center">
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#a8a8a8]">
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
                          isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#12161b]" : "opacity-80"
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
