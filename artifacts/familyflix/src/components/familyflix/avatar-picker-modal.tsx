import { useState } from "react";
import { X, Check, Image, Sparkles, User, Upload, Baby, Users } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { useSubscription } from "@/lib/subscription-context";

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AvatarOption {
  id: string;
  name: string;
  url: string;
  category: "demure" | "kids" | "adults";
  role: string;
  isDefault?: boolean;
}

// 4 Exclusive Demure 3D Neon Studio Avatars
export const DEMURE_AVATARS: AvatarOption[] = [
  {
    id: "3d-demure-maya",
    name: "Maya",
    url: "/avatars/demure/demure-avatar-1.jpg",
    category: "demure",
    role: "Demure Creative Director",
  },
  {
    id: "3d-demure-devon",
    name: "Devon",
    url: "/avatars/demure/demure-avatar-2.jpg",
    category: "demure",
    role: "Demure Neon Founder",
  },
  {
    id: "3d-demure-chloe",
    name: "Chloe",
    url: "/avatars/demure/demure-avatar-3.jpg",
    category: "demure",
    role: "Demure Studio Curator",
  },
  {
    id: "3d-demure-noah",
    name: "Noah",
    url: "/avatars/demure/demure-avatar-4.jpg",
    category: "demure",
    role: "Demure Producer",
  },
];

// 8 High-Definition 3D Young Avatars for Kids
export const KIDS_AVATARS: AvatarOption[] = [
  {
    id: "3d-kid-amara",
    name: "Amara",
    url: "/avatars/kids/kid-1.png",
    category: "kids",
    role: "Joyful Smile · Default Kids",
    isDefault: true,
  },
  {
    id: "3d-kid-kofi",
    name: "Kofi",
    url: "/avatars/kids/kid-2.png",
    category: "kids",
    role: "Afro Star",
  },
  {
    id: "3d-kid-zuri",
    name: "Zuri",
    url: "/avatars/kids/kid-3.png",
    category: "kids",
    role: "Buns & Sparkle",
  },
  {
    id: "3d-kid-tariq",
    name: "Tariq",
    url: "/avatars/kids/kid-4.png",
    category: "kids",
    role: "Playful Hero",
  },
  {
    id: "3d-kid-malik",
    name: "Malik",
    url: "/avatars/kids/kid-5.png",
    category: "kids",
    role: "Wonder Explorer",
  },
  {
    id: "3d-kid-nia",
    name: "Nia",
    url: "/avatars/kids/kid-6.png",
    category: "kids",
    role: "Sunshine Smiles",
  },
  {
    id: "3d-kid-jabari",
    name: "Jabari",
    url: "/avatars/kids/kid-7.png",
    category: "kids",
    role: "Bold Scout",
  },
  {
    id: "3d-kid-aaliyah",
    name: "Aaliyah",
    url: "/avatars/kids/kid-8.png",
    category: "kids",
    role: "Creative Spirit",
  },
];

// 12 High-Definition 3D Older/Adult Avatars for Adults & Guest
export const ADULT_AVATARS: AvatarOption[] = [
  {
    id: "3d-adult-kwame",
    name: "Kwame",
    url: "/avatars/adults/adult-1.png",
    category: "adults",
    role: "Cinema Director · Default Guest",
    isDefault: true,
  },
  {
    id: "3d-adult-fatima",
    name: "Fatima",
    url: "/avatars/adults/adult-2.png",
    category: "adults",
    role: "Studio Producer",
  },
  {
    id: "3d-adult-darius",
    name: "Darius",
    url: "/avatars/adults/adult-3.png",
    category: "adults",
    role: "Film Critic",
  },
  {
    id: "3d-adult-solomon",
    name: "Solomon",
    url: "/avatars/adults/adult-4.png",
    category: "adults",
    role: "Senior Elder",
  },
  {
    id: "3d-adult-osei",
    name: "Dr. Osei",
    url: "/avatars/adults/adult-5.png",
    category: "adults",
    role: "Distinguished Scholar",
  },
  {
    id: "3d-adult-marcus",
    name: "Marcus",
    url: "/avatars/adults/adult-6.png",
    category: "adults",
    role: "Creative Visionary",
  },
  {
    id: "3d-adult-amina",
    name: "Amina",
    url: "/avatars/adults/adult-7.png",
    category: "adults",
    role: "Executive Producer",
  },
  {
    id: "3d-adult-ezekiel",
    name: "Ezekiel",
    url: "/avatars/adults/adult-8.png",
    category: "adults",
    role: "Storyteller",
  },
  {
    id: "3d-adult-zainab",
    name: "Zainab",
    url: "/avatars/adults/adult-9.png",
    category: "adults",
    role: "Cinematheque Curator",
  },
  {
    id: "3d-adult-ayanna",
    name: "Ayanna",
    url: "/avatars/adults/adult-10.png",
    category: "adults",
    role: "Arts & Culture Lead",
  },
  {
    id: "3d-adult-idris",
    name: "Idris",
    url: "/avatars/adults/adult-11.png",
    category: "adults",
    role: "Sound & Score Engineer",
  },
  {
    id: "3d-adult-makena",
    name: "Makena",
    url: "/avatars/adults/adult-12.png",
    category: "adults",
    role: "Indie Curator",
  },
];

// Combined list of all 24 avatars (Demure Originals first, followed by Kids & Adults)
export const AVATAR_OPTIONS: AvatarOption[] = [
  ...DEMURE_AVATARS,
  ...KIDS_AVATARS,
  ...ADULT_AVATARS,
];

// Cinematic Banner Covers
export const COVER_OPTIONS = [
  {
    id: "cover-demure-crew",
    name: "Demure Cinema Crew",
    url: "/avatars/demure/demure-familyflix-crew.jpg",
    gradient: "linear-gradient(135deg, #0c1014, #7c3aed, #d6249f)",
  },
  {
    id: "cover-cyberpunk",
    name: "Demure Cinema Stage",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #0c1014, #4a154b, #6b21a8)",
  },
  {
    id: "cover-velvet",
    name: "Golden Velvet Cinema",
    url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #0c1014, #2d1847, #7c3aed)",
  },
  {
    id: "cover-nebula",
    name: "Cosmic Nebula",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #0c1014, #1e1b4b, #0095f6)",
  },
  {
    id: "cover-neon",
    name: "Neon Horizon",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #0c1014, #3730a3, #d6249f)",
  },
  {
    id: "cover-drivein",
    name: "Vintage Drive-In",
    url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #0c1014, #212328, #78716c)",
  },
  {
    id: "cover-kids",
    name: "FamilyFlix Kids World",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&h=400&q=80",
    gradient: "linear-gradient(135deg, #fd5949, #d6249f, #0095f6)",
  },
];

export function AvatarPickerModal({ isOpen, onClose }: AvatarPickerModalProps) {
  const { activeProfile, updateProfile, isKidsMode } = useProfile();
  const { isSubscribed } = useSubscription();

  const [activeTab, setActiveTab] = useState<"avatar" | "cover">("avatar");
  const [avatarCategory, setAvatarCategory] = useState<"all" | "demure" | "kids" | "adults">(
    isKidsMode || activeProfile.isKids ? "kids" : "all"
  );
  const [customUrl, setCustomUrl] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(
    activeProfile.avatar || (activeProfile.isKids ? "/avatars/kids/kid-1.png" : "/avatars/adults/adult-1.png")
  );
  const [selectedCover, setSelectedCover] = useState<string>(
    activeProfile.avatarCover || COVER_OPTIONS[0].url
  );

  if (!isOpen) return null;

  const handleSave = () => {
    updateProfile(activeProfile.id, {
      avatar: selectedAvatar,
      ...(selectedCover ? { avatarCover: selectedCover } : {}),
    });
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    if (activeTab === "avatar") {
      setSelectedAvatar(customUrl.trim());
    } else {
      setSelectedCover(customUrl.trim());
    }
    setCustomUrl("");
  };

  const displayedAvatars =
    avatarCategory === "demure"
      ? DEMURE_AVATARS
      : avatarCategory === "kids"
      ? KIDS_AVATARS
      : avatarCategory === "adults"
      ? ADULT_AVATARS
      : AVATAR_OPTIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1014]/85 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12161b] p-6 sm:p-8 shadow-2xl text-[#f5f5f5]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Choose Your 3D Avatar</h3>
            <p className="text-xs text-white/60">
              Young avatars for kids & older avatars for adults and guests
            </p>
          </div>
        </div>

        {/* Tab Switcher (Avatar vs Cover) */}
        <div className="mt-5 flex gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("avatar")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "avatar"
                ? "bg-[#0095f6] text-white shadow-md shadow-[#0095f6]/30"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <User size={14} /> 3D Avatars ({AVATAR_OPTIONS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cover")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "cover"
                ? "bg-[#0095f6] text-white shadow-md shadow-[#0095f6]/30"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <Image size={14} /> Cinema Banner Covers
          </button>
        </div>

        {/* Preview Section */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1014]/70">
          <div
            className="h-28 w-full bg-cover bg-center transition-all duration-300"
            style={{ backgroundImage: `url(${selectedCover})` }}
          />
          <div className="relative -mt-10 flex items-center gap-3 px-4 pb-3">
            <div className="demure-ring relative size-[68px] shrink-0 rounded-2xl p-[2px] shadow-xl">
              <div
                className="relative size-full overflow-hidden rounded-[14px] border-2 border-[#0c1014]"
                style={{ background: activeProfile.avatarColor }}
              >
                <img
                  src={selectedAvatar}
                  alt="Selected Avatar"
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                {activeProfile.name}
                {isSubscribed && (
                  <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30">
                    VIP
                  </span>
                )}
                {activeProfile.isKids && (
                  <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-black uppercase text-black">
                    Kids
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                {activeProfile.isKids ? "Kids Profile Avatar" : "Viewer Profile Avatar"}
              </p>
            </div>
          </div>
        </div>

        {/* Avatar Category Filter Pills */}
        {activeTab === "avatar" && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAvatarCategory("all")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  avatarCategory === "all"
                    ? "bg-white text-[#0c1014] shadow-sm"
                    : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Users size={12} /> All ({AVATAR_OPTIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory("demure")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  avatarCategory === "demure"
                    ? "bg-gradient-to-r from-[#0095f6] via-[#7c3aed] to-[#d6249f] text-white shadow-md shadow-[#d6249f]/30"
                    : "border border-[#0095f6]/35 bg-[#0095f6]/10 text-[#00d2ff] hover:bg-[#0095f6]/20"
                }`}
              >
                <Sparkles size={12} /> Demure 3D ({DEMURE_AVATARS.length})
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory("kids")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  avatarCategory === "kids"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/25"
                    : "border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                }`}
              >
                <Baby size={12} /> Kids & Young ({KIDS_AVATARS.length})
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory("adults")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  avatarCategory === "adults"
                    ? "bg-[#0095f6] text-white shadow-md shadow-[#0095f6]/30"
                    : "border border-[#0095f6]/30 bg-[#0095f6]/10 text-[#708dff] hover:bg-[#0095f6]/20"
                }`}
              >
                <User size={12} /> Adults & Elders ({ADULT_AVATARS.length})
              </button>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 max-h-[320px] overflow-y-auto pr-1">
              {displayedAvatars.map((a) => {
                const isCurrent = selectedAvatar === a.url;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAvatar(a.url)}
                    className={`group relative flex flex-col items-center rounded-2xl border p-2 transition ${
                      isCurrent
                        ? "border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className="relative size-16 overflow-hidden rounded-xl shadow-inner"
                      style={{ background: activeProfile.avatarColor }}
                    >
                      <img
                        src={a.url}
                        alt={a.name}
                        className="size-full object-cover transition group-hover:scale-105"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 grid place-items-center bg-purple-600/40 backdrop-blur-[1px]">
                          <Check size={20} className="text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span className="mt-1.5 line-clamp-1 text-center text-[10.5px] font-bold text-white/90">
                      {a.name}
                    </span>
                    <span
                      className={`mt-0.5 rounded-full px-1.5 py-0.2 text-[8.5px] font-extrabold uppercase ${
                        a.category === "kids"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {a.category === "kids" ? "Kid" : "Adult"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cover Grid */}
        {activeTab === "cover" && (
          <div className="mt-5 space-y-2.5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COVER_OPTIONS.map((c) => {
                const isCurrent = selectedCover === c.url;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCover(c.url)}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                      isCurrent
                        ? "border-purple-500 ring-2 ring-purple-500/40"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div
                      className="h-20 w-full bg-cover bg-center transition group-hover:scale-105"
                      style={{ backgroundImage: `url(${c.url})` }}
                    >
                      {isCurrent && (
                        <div className="size-full grid place-items-center bg-black/40">
                          <Check size={18} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="bg-[#1a1426] p-2 text-[11px] font-bold text-white/80 line-clamp-1">
                      {c.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom URL Input */}
        <form onSubmit={handleApplyCustom} className="mt-5 flex gap-2">
          <input
            type="url"
            placeholder={
              activeTab === "avatar"
                ? "Or paste custom 3D avatar image URL..."
                : "Or paste custom banner cover image URL..."
            }
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            <Upload size={13} /> Set
          </button>
        </form>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/30 transition"
          >
            <Check size={14} /> Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
