import { SearchExperience } from "@/components/familyflix/search-experience";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;

  return <SearchExperience initialQuery={rawQuery ?? ""} />;
}
