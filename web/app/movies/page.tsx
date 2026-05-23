import { BrowseResults } from "@/components/BrowseResults";

export const revalidate = 3600;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    genre?: string;
  }>;
}) {
  const sp = await searchParams;

  return (
    <main className="container">
      <header className="catalog-hero">
        <span className="catalog-hero-orb catalog-hero-orb-1" aria-hidden="true" />
        <span className="catalog-hero-orb catalog-hero-orb-2" aria-hidden="true" />
        <p className="catalog-eyebrow">Full catalogue</p>
        <h1>All movies</h1>
        <p>
          Search the collection, narrow by genre, and sort the list without
          leaving the catalog.
        </p>
      </header>
      <BrowseResults searchParams={sp} />
    </main>
  );
}
