import { BrowseHeader, EmptyResults, GenreChips, PosterGrid } from "@/components/familyflix/browse";
import { allGenres, movies } from "@/lib/catalog";

export const metadata = { title: "Movies" };

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawGenre = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const activeGenre = rawGenre && allGenres.includes(rawGenre) ? rawGenre : "";
  const items = activeGenre
    ? movies.filter((title) => title.genres.includes(activeGenre))
    : movies;
  const genres = Array.from(new Set(movies.flatMap((title) => title.genres))).sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <>
      <BrowseHeader
        eyebrow="Watch free"
        title="Movies"
        description="Big-screen stories, zero rental fees. Every movie here is free with ads — no subscription and no credit card."
        count={items.length}
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-2 sm:px-6 md:px-8 xl:px-12">
        <GenreChips genres={genres} active={activeGenre} basePath="/movies" />
        {items.length > 0 ? (
          <PosterGrid items={items} />
        ) : (
          <EmptyResults query={activeGenre || "movies"} />
        )}
      </div>
    </>
  );
}
