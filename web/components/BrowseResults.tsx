import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/MovieCard";
import { Controls } from "@/components/Controls";
import { Pagination } from "@/components/Pagination";
import type { Movie } from "@/lib/types";
import { getRatedIds } from "@/lib/userEngagement";

const PAGE_SIZE = 30;

const SORT_COLUMNS: Record<string, { column: string; ascending: boolean }> = {
  popularity: { column: "popularity", ascending: false },
  rating: { column: "vote_average", ascending: false },
  newest: { column: "release_date", ascending: false },
  title: { column: "title", ascending: true },
};

export async function BrowseResults({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; sort?: string; genre?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = (searchParams.q ?? "").trim();
  const genre = (searchParams.genre ?? "").trim();
  const sortKey =
    searchParams.sort && SORT_COLUMNS[searchParams.sort]
      ? searchParams.sort
      : "popularity";
  const sort = SORT_COLUMNS[sortKey];

  let query = supabase
    .from("movies")
    .select("tmdb_id,title,poster_url,release_date,vote_average,genres_text", {
      count: "exact",
    });

  if (q) query = query.ilike("title", `%${q}%`);
  if (genre) query = query.ilike("genres_text", `%${genre}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order("vote_count", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const movies = (data ?? []) as Movie[];
  const total = count ?? 0;
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
                {q && <span>Title: {q}</span>}
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
