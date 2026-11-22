import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";

export interface TubiProfile {
  id: string;
  name: string;
  isKids: boolean;
  avatarColor: string;
  avatarIcon: string;
  avatar?: string;
  avatarCover?: string;
  createdAt: number;
}

const DEFAULT_PROFILES: TubiProfile[] = [
  {
    id: "profile-guest",
    name: "Guest",
    isKids: false,
    avatarColor: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    avatarIcon: "user",
    avatar: "/avatars/adults/adult-1.png",
    createdAt: 1,
  },
  {
    id: "profile-kids",
    name: "Kids",
    isKids: true,
    avatarColor: "linear-gradient(135deg, #f59e0b, #ec4899)",
    avatarIcon: "sparkles",
    avatar: "/avatars/kids/kid-1.png",
    createdAt: 2,
  },
];

interface ProfileContextType {
  profiles: TubiProfile[];
  activeProfile: TubiProfile;
  isKidsMode: boolean;
  switchProfile: (id: string) => void;
  createProfile: (data: {
    name: string;
    isKids: boolean;
    avatarColor: string;
    avatarIcon: string;
    avatar?: string;
    avatarCover?: string;
  }) => TubiProfile;
  updateProfile: (id: string, updates: Partial<TubiProfile>) => void;
  deleteProfile: (id: string) => void;
  toggleKidsMode: () => void;
  exitKidsMode: () => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const STORAGE_PROFILES = "familyflix:profiles";
const STORAGE_ACTIVE = "familyflix:active-profile-id";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<TubiProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: TubiProfile) => {
            const isKids = Boolean(p.isKids);
            const needsAvatar = !p.avatar || p.avatar.includes("unsplash.com");
            return {
              ...p,
              avatar: needsAvatar
                ? (isKids ? "/avatars/kids/kid-1.png" : "/avatars/adults/adult-1.png")
                : p.avatar,
            };
          });
        }
      }
    } catch {}
    return DEFAULT_PROFILES;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE);
      if (saved) return saved;
    } catch {}
    return "profile-guest";
  });

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeId) || profiles[0] || DEFAULT_PROFILES[0];
  }, [profiles, activeId]);

  const isKidsMode = Boolean(activeProfile.isKids);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE, activeProfile.id);
    } catch {}
  }, [activeProfile.id]);

  function switchProfile(id: string) {
    const target = profiles.find((p) => p.id === id);
    if (target) {
      setActiveId(target.id);
    }
  }

  function createProfile(data: {
    name: string;
    isKids: boolean;
    avatarColor: string;
    avatarIcon: string;
    avatar?: string;
    avatarCover?: string;
  }) {
    if (profiles.length >= 6) {
      return activeProfile;
    }
    const newProfile: TubiProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim() || (data.isKids ? "Kids" : "Profile"),
      isKids: data.isKids,
      avatarColor: data.avatarColor,
      avatarIcon: data.avatarIcon || (data.isKids ? "sparkles" : "user"),
      avatar: data.avatar || (data.isKids ? "/avatars/kids/kid-1.png" : "/avatars/adults/adult-1.png"),
      avatarCover: data.avatarCover,
      createdAt: Date.now(),
    };
    setProfiles((prev) => [...prev, newProfile]);
    setActiveId(newProfile.id);
    return newProfile;
  }

  function updateProfile(id: string, updates: Partial<TubiProfile>) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function deleteProfile(id: string) {
    if (id === "profile-guest" || id === "profile-kids") return; // Keep standard profiles
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id || "profile-guest");
      }
      return next;
    });
  }

  function toggleKidsMode() {
    if (isKidsMode) {
      exitKidsMode();
    } else {
      const kidsProfile = profiles.find((p) => p.isKids);
      if (kidsProfile) {
        setActiveId(kidsProfile.id);
      } else {
        const created = createProfile({
          name: "Kids",
          isKids: true,
          avatarColor: "linear-gradient(135deg, #f59e0b, #ec4899)",
          avatarIcon: "sparkles",
        });
        setActiveId(created.id);
      }
    }
  }

  function exitKidsMode() {
    const nonKid = profiles.find((p) => !p.isKids) || DEFAULT_PROFILES[0];
    setActiveId(nonKid.id);
  }

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isKidsMode,
        switchProfile,
        createProfile,
        updateProfile,
        deleteProfile,
        toggleKidsMode,
        exitKidsMode,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
