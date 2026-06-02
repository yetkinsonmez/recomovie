import { supabase } from "@/lib/supabase";

// One sitemap file per 1,000 URLs. Well under the 50k/file limit, and small
// enough that each chunk stays under PostgREST's default max-rows cap with a
// single range query (no per-file looping needed).
export const PER_SITEMAP = 1000;

export async function sitemapMovieCount(): Promise<number> {
  const { count } = await supabase
    .from("movies")
    .select("tmdb_id", { count: "exact", head: true });
  return count ?? 0;
}

export async function sitemapDirectorCount(): Promise<number> {
  const { data } = await supabase.rpc("sitemap_director_count");
  return typeof data === "number" ? data : 0;
}

/**
 * How many sitemap chunk files generateSitemaps() emits, and how many of those
 * are movie chunks (the rest are director/person chunks). There is always at
 * least one movie chunk so the homepage + catalog have somewhere to live.
 *
 * The sitemap index route and generateSitemaps() both derive their chunk list
 * from this, so /sitemap_index.xml and the actual /sitemap/<id>.xml files can
 * never drift out of sync.
 */
export async function sitemapChunkCounts(): Promise<{
  total: number;
  movieFiles: number;
}> {
  const [movies, directors] = await Promise.all([
    sitemapMovieCount(),
    sitemapDirectorCount(),
  ]);
  const movieFiles = Math.max(1, Math.ceil(movies / PER_SITEMAP));
  const directorFiles = Math.ceil(directors / PER_SITEMAP);
  return { total: movieFiles + directorFiles, movieFiles };
}
