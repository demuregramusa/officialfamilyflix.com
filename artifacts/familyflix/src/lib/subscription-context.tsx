import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authClient } from "./auth-client";

export interface OfflineDownloadItem {
  slug: string;
  name: string;
  posterUrl?: string;
  savedAt: number;
  size: string;
  episodeId?: string;
  episodeName?: string;
}

export interface SubscriptionContextType {
  tier: "free" | "premium";
  isSubscribed: boolean;
  isVerified: boolean;
  hasAdFree: boolean;
  hasUncappedQuality: boolean;
  hasSaveToDevice: boolean;
  hasPreOrder: boolean;
  hasCustomAvatars: boolean;
  hasAIAssistant: boolean;
  voiceChatEnabled: boolean;
  setVoiceChatEnabled: (enabled: boolean) => void;
  humanVoice: string;
  setHumanVoice: (voice: string) => void;
  preOrders: string[];
  offlineDownloads: OfflineDownloadItem[];
  isPreOrdered: (slug: string) => boolean;
  isDownloaded: (slug: string, episodeId?: string) => boolean;
  togglePreOrder: (slug: string, titleName: string) => Promise<boolean>;
  saveToDevice: (item: Omit<OfflineDownloadItem, "savedAt" | "size">) => Promise<void>;
  removeDownload: (slug: string, episodeId?: string) => void;
  upgradeToVIP: () => void;
  cancelVIP: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  isSubscriptionModalOpen: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const STORAGE_KEY = "familyflix_vip_tier";
const PREORDERS_KEY = "familyflix_user_preorders";
const DOWNLOADS_KEY = "familyflix_offline_downloads";
const VOICE_KEY = "familyflix_voice_chat_enabled";
const HUMAN_VOICE_KEY = "familyflix_human_voice_selection";

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voiceChatEnabled, setVoiceChatEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(VOICE_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const setVoiceChatEnabled = useCallback((enabled: boolean) => {
    setVoiceChatEnabledState(enabled);
    try {
      localStorage.setItem(VOICE_KEY, JSON.stringify(enabled));
    } catch {}
  }, []);

  const [humanVoice, setHumanVoiceState] = useState<string>(() => {
    try {
      return localStorage.getItem(HUMAN_VOICE_KEY) || "emma";
    } catch {
      return "emma";
    }
  });

  const setHumanVoice = useCallback((v: string) => {
    setHumanVoiceState(v);
    try {
      localStorage.setItem(HUMAN_VOICE_KEY, v);
    } catch {}
  }, []);

  // Admin user iam23yhb@gmail.com or role admin is automatically VIP
  const isAdmin =
    session?.user?.role === "admin" ||
    session?.user?.email?.toLowerCase() === "iam23yhb@gmail.com";

  const [localSubscribed, setLocalSubscribed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "premium";
    } catch {
      return false;
    }
  });

  const isSubscribed = isAdmin || localSubscribed;
  const tier: "free" | "premium" = isSubscribed ? "premium" : "free";

  const [preOrders, setPreOrders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PREORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [offlineDownloads, setOfflineDownloads] = useState<OfflineDownloadItem[]>(() => {
    try {
      const stored = localStorage.getItem(DOWNLOADS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync with backend subscription endpoint if available
  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/subscription")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.isSubscribed) {
            setLocalSubscribed(true);
            try {
              localStorage.setItem(STORAGE_KEY, "premium");
            } catch {}
          }
        })
        .catch(() => {});

      fetch("/api/user/pre-orders")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (Array.isArray(data?.items)) {
            setPreOrders(data.items);
            try {
              localStorage.setItem(PREORDERS_KEY, JSON.stringify(data.items));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [session?.user]);

  const upgradeToVIP = useCallback(() => {
    setLocalSubscribed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "premium");
    } catch {}
    fetch("/api/user/subscription/upgrade", { method: "POST" }).catch(() => {});
    setIsModalOpen(false);
  }, []);

  const cancelVIP = useCallback(() => {
    if (isAdmin) return; // Admin remains VIP
    setLocalSubscribed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [isAdmin]);

  const isPreOrdered = useCallback(
    (slug: string) => preOrders.includes(slug),
    [preOrders]
  );

  const togglePreOrder = useCallback(
    async (slug: string, titleName: string): Promise<boolean> => {
      const exists = preOrders.includes(slug);
      let updated: string[];
      if (exists) {
        updated = preOrders.filter((s) => s !== slug);
        fetch(`/api/user/pre-orders/${encodeURIComponent(slug)}`, { method: "DELETE" }).catch(() => {});
      } else {
        updated = [...preOrders, slug];
        fetch("/api/user/pre-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, titleName }),
        }).catch(() => {});
      }
      setPreOrders(updated);
      try {
        localStorage.setItem(PREORDERS_KEY, JSON.stringify(updated));
      } catch {}
      return !exists;
    },
    [preOrders]
  );

  const isDownloaded = useCallback(
    (slug: string, episodeId?: string) => {
      return offlineDownloads.some(
        (d) => d.slug === slug && (episodeId ? d.episodeId === episodeId : !d.episodeId)
      );
    },
    [offlineDownloads]
  );

  const saveToDevice = useCallback(
    async (item: Omit<OfflineDownloadItem, "savedAt" | "size">) => {
      const existing = offlineDownloads.filter(
        (d) => !(d.slug === item.slug && (item.episodeId ? d.episodeId === item.episodeId : !d.episodeId))
      );
      // Realistic estimated bundle size based on 1080p offline stream (600MB - 1.4GB)
      const randomMb = Math.floor(Math.random() * 500) + 750;
      const newItem: OfflineDownloadItem = {
        ...item,
        savedAt: Date.now(),
        size: `${(randomMb / 1024).toFixed(2)} GB`,
      };
      const updated = [newItem, ...existing];
      setOfflineDownloads(updated);
      try {
        localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
      } catch {}
    },
    [offlineDownloads]
  );

  const removeDownload = useCallback(
    (slug: string, episodeId?: string) => {
      const updated = offlineDownloads.filter(
        (d) => !(d.slug === slug && (episodeId ? d.episodeId === episodeId : !d.episodeId))
      );
      setOfflineDownloads(updated);
      try {
        localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
      } catch {}
    },
    [offlineDownloads]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isSubscribed,
        isVerified: isSubscribed,
        hasAdFree: isSubscribed,
        hasUncappedQuality: isSubscribed,
        hasSaveToDevice: isSubscribed,
        hasPreOrder: isSubscribed,
        hasCustomAvatars: isSubscribed,
        hasAIAssistant: true, // Assistant available to all, voice chat unlocked for VIP
        voiceChatEnabled,
        setVoiceChatEnabled,
        humanVoice,
        setHumanVoice,
        preOrders,
        offlineDownloads,
        isPreOrdered,
        isDownloaded,
        togglePreOrder,
        saveToDevice,
        removeDownload,
        upgradeToVIP,
        cancelVIP,
        openSubscriptionModal: () => setIsModalOpen(true),
        closeSubscriptionModal: () => setIsModalOpen(false),
        isSubscriptionModalOpen: isModalOpen,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
