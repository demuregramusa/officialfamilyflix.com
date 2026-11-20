"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "familyflix:my-list";
const CHANGE_EVENT = "familyflix:my-list-change";

interface MyListState {
  slugs: string[];
  hydrated: boolean;
}

const SERVER_STATE: MyListState = { slugs: [], hydrated: false };

let cachedRaw: string | null | undefined;
let cachedState: MyListState = SERVER_STATE;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseSlugs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getSnapshot(): MyListState {
  const raw = readStorage();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = { slugs: parseSlugs(raw), hydrated: true };
  }
  return cachedState;
}

function getServerSnapshot(): MyListState {
  return SERVER_STATE;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function commit(slugs: string[]) {
  cachedRaw = JSON.stringify(slugs);
  cachedState = { slugs, hydrated: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Storage can be unavailable in private browsing; the list still works in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface MyListContextValue {
  slugs: string[];
  hydrated: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
}

const MyListContext = createContext<MyListContextValue | null>(null);

export function MyListProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { slugs, hydrated } = state;

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback((slug: string) => {
    const current = getSnapshot().slugs;
    if (current.includes(slug)) {
      commit(current.filter((item) => item !== slug));
      return false;
    }
    commit([slug, ...current]);
    return true;
  }, []);

  const remove = useCallback((slug: string) => {
    commit(getSnapshot().slugs.filter((item) => item !== slug));
  }, []);

  const clear = useCallback(() => commit([]), []);

  const value = useMemo(
    () => ({ slugs, hydrated, has, toggle, remove, clear }),
    [slugs, hydrated, has, toggle, remove, clear],
  );

  return <MyListContext.Provider value={value}>{children}</MyListContext.Provider>;
}

export function useMyList() {
  const context = useContext(MyListContext);
  if (!context) {
    throw new Error("useMyList must be used inside MyListProvider");
  }
  return context;
}
