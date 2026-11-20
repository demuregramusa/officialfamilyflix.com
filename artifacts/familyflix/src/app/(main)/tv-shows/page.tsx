import { BrowseHeader, EmptyResults, GenreChips, PosterGrid } from "@/components/familyflix/browse";
import { allGenres, series } from "@/lib/catalog";

export const metadata = { title: "TV Shows" };

export default async function TvShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawGenre = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const activeGenre = rawGenre && allGenres.includes(rawGenre) ? rawGenre : "";
  const items = activeGenre
    ? series.filter((title) => title.genres.includes(activeGenre))
    : series;
  const genres = Array.from(new Set(series.flatMap((title) => title.genres))).sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <>
      <BrowseHeader
        eyebrow="Binge free"
        title="TV Shows"
        description="Full seasons, no subscription. Start a new series or catch up on the ones everyone at work is already talking about."
        count={items.length}
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-2 sm:px-6 md:px-8 xl:px-12">
        <GenreChips genres={genres} active={activeGenre} basePath="/tv-shows" />
        {items.length > 0 ? (
          <PosterGrid items={items} />
        ) : (
          <EmptyResults query={activeGenre || "shows"} />
        )}
      </div>
    </>
  );
}
