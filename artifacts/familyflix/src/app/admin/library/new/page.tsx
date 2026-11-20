import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  emptyMovieFormValues,
  MovieForm,
} from "@/components/admin/movie-form";
import { requireStaffPage } from "@/lib/admin-auth";
import { can } from "@/lib/admin/permissions";
import { tmdbConfigured } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

export default async function NewTitlePage() {
  const session = await requireStaffPage("library.create");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/library"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 transition hover:text-white"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to library
        </Link>
        <h1 className="mt-2 text-[26px] font-black tracking-[-0.03em] text-white">
          Add a title
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-white/40">
          Save the metadata and rights as a draft. After saving you can upload the
          master, attach subtitles and publish.
        </p>
      </div>

      <MovieForm
        mode="create"
        initial={emptyMovieFormValues}
        tmdbEnabled={tmdbConfigured()}
        canManageRights={can(session.user.role, "rights.manage")}
        canPublish={can(session.user.role, "library.publish")}
      />
    </div>
  );
}
