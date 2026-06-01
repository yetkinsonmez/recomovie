import { Controls } from "@/components/Controls";

// Hero + search/filter Controls live in the layout so they persist across
// searchParams navigations. Only the results (the page) suspend and swap to
// the loading skeleton, which keeps the search box mounted — it never blinks
// out and holds the user's typed query + focus while results stream in.
export default function MoviesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <section className="catalog-shell">
        <Controls />
        {children}
      </section>
    </main>
  );
}
