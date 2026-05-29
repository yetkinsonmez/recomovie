import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/MovieCard";
import { Controls } from "@/components/Controls";
import { Pagination } from "@/components/Pagination";
import type { Movie } from "@/lib/types";
import { getRatedIds } from "@/lib/userEngagement";

const PAGE_SIZE = 30;

const VALID_SORTS = new Set(["popularity", "rating", "newest", "title"]);

// Row shape returned by the search_movies RPC: a Movie plus a window count of
// all rows matching the current filter (same value on every row).
type SearchRow = Movie & { total_count: number };

export async function BrowseResults({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; sort?: string; genre?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = (searchParams.q ?? "").trim();
  const genre = (searchParams.genre ?? "").trim();
  const sortKey =
    searchParams.sort && VALID_SORTS.has(searchParams.sort)
      ? searchParams.sort
      : "popularity";

  const from = (page - 1) * PAGE_SIZE;

  // Single RPC matches q against title, director and cast names, applies the
  // genre filter + sort, and returns the page plus the total via a window count.
  const { data, error } = await supabase.rpc("search_movies", {
    p_q: q,
    p_genre: genre,
    p_sort: sortKey,
    p_limit: PAGE_SIZE,
    p_offset: from,
  });

  const rows = (data ?? []) as SearchRow[];
  const movies: Movie[] = rows.map(
    ({ total_count: _total, ...movie }) => movie,
  );
  const total = rows.length ? Number(rows[0].total_count) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ratedIds = await getRatedIds();

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (genre) baseParams.set("genre", genre);
  if (sortKey !== "popularity") baseParams.set("sort", sortKey);
  const sortLabel =
    sortKey === "rating"
      ? "Top rated"
      : sortKey === "newest"
        ? "Newest"
        : sortKey === "title"
          ? "A-Z"
          : "Most popular";

  return (
    <section className="catalog-shell">
      <Controls />

      {error ? (
        <p className="error">Failed to load movies: {error.message}</p>
      ) : movies.length === 0 ? (
        <p className="empty">No movies match your search.</p>
      ) : (
        <>
          <div className="catalog-summary">
            <div>
              <p className="result-count">
                {total.toLocaleString()} movie{total === 1 ? "" : "s"} · page{" "}
                {page} of {totalPages}
              </p>
              <div className="active-filters" aria-label="Active filters">
                {q && <span>Search: {q}</span>}
                {genre && <span>Genre: {genre}</span>}
                {sortKey !== "popularity" && <span>Sort: {sortLabel}</span>}
              </div>
            </div>
          </div>

          <section className="grid catalog-grid">
            {movies.map((movie) => (
              <MovieCard
                key={movie.tmdb_id}
                movie={movie}
                isRated={ratedIds.has(movie.tmdb_id)}
              />
            ))}
          </section>
          <Pagination
            page={page}
            totalPages={totalPages}
            baseParams={baseParams.toString()}
            basePath="/movies"
          />
        </>
      )}
    </section>
  );
}
