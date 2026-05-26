import { MovieCard } from "./MovieCard";
import type { Movie } from "@/lib/types";

// Shared shell used by Hot This Week, For You, Because You Rated…
// Renders a labelled section with a tight 6-up grid. Tag = small chip above
// the title (eyebrow). Optional `meta` slot for "Updated just now" etc.
export function HomeFeedSection({
  eyebrow,
  title,
  meta,
  movies,
  ratedIds,
  emptyHint,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  movies: Movie[];
  ratedIds?: Set<number>;
  emptyHint?: string;
}) {
  if (movies.length === 0 && emptyHint) {
    return (
      <section className="home-feed-section">
        <header className="home-feed-head">
          {eyebrow && <p className="catalog-eyebrow">{eyebrow}</p>}
          <h2 className="home-feed-title">{title}</h2>
        </header>
        <p className="meta home-feed-empty">{emptyHint}</p>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section className="home-feed-section">
      <header className="home-feed-head">
        {eyebrow && <p className="catalog-eyebrow">{eyebrow}</p>}
        <h2 className="home-feed-title">{title}</h2>
        {meta && <span className="home-feed-meta meta">{meta}</span>}
      </header>
      <div className="grid home-feed-grid">
        {movies.map((m) => (
          <MovieCard
            key={m.tmdb_id}
            movie={m}
            isRated={ratedIds?.has(m.tmdb_id) ?? false}
          />
        ))}
      </div>
    </section>
  );
}
