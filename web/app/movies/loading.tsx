import { MovieCardSkeleton } from "@/components/Skeletons";

// Shown only for the results region — the hero and search Controls live in the
// layout and stay put. Mirrors BrowseResults' shape (summary line + grid) so
// the swap to real results doesn't shift layout.
export default function Loading() {
  return (
    <div className="catalog-loading" aria-hidden="true">
      <div className="catalog-summary">
        <div className="sk sk-line" style={{ width: 220, height: 18 }} />
      </div>
      <section className="grid catalog-grid">
        {Array.from({ length: 18 }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </section>
    </div>
  );
}
