"use client";

import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BrowseHeader, PosterGrid } from "@/components/familyflix/browse";
import { useMyList } from "@/components/familyflix/my-list-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getTitles } from "@/lib/catalog";

export function MyListExperience() {
  const { slugs, hydrated, clear } = useMyList();
  const saved = getTitles(slugs);

  return (
    <>
      <BrowseHeader
        eyebrow="Saved for later"
        title="My List"
        description="Everything you have saved, in one place. Your list stays on this device, so you can pick right back up."
        count={hydrated ? saved.length : undefined}
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-7 sm:px-6 md:px-8 xl:px-12">
        {!hydrated ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-white/[0.06]" />
                <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
            <span className="sr-only">Loading your list…</span>
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-white/[0.06] text-white/45">
              <Bookmark className="size-5" aria-hidden />
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-white">
              Your list is empty
            </h2>
            <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/45">
              Save movies and shows with the + button and they will show up here
              the next time you want them.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link
                href="/movies"
                className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Browse movies
              </Link>
              <Link
                href="/tv-shows"
                className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white/75 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Browse TV shows
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-white/45">
                {saved.length} {saved.length === 1 ? "title" : "titles"} saved on this
                device
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] font-semibold text-white/55 transition hover:border-[#f04444]/50 hover:text-[#ff8a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Clear list
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear My List?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all {saved.length}{" "}
                      {saved.length === 1 ? "title" : "titles"} from this device.
                      You can add them again at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep my list</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        clear();
                        toast.success("My List cleared");
                      }}
                    >
                      Clear list
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <PosterGrid items={saved} />
          </>
        )}
      </div>
    </>
  );
}
