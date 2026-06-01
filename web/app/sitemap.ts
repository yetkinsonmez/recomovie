import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/siteUrl";

// One sitemap file per 1,000 URLs. Well under the 50k/file limit, and small
// enough that each chunk stays under PostgREST's default max-rows cap with a
// single range query (no per-file looping needed).
const PER_SITEMAP = 1000;

export const revalidate = 86400; // regenerate at most once a day

async function movieCount(): Promise<number> {
  const { count } = await supabase
    .from("movies")
    .select("tmdb_id", { count: "exact", head: true });
  return count ?? 0;
}

async function directorCount(): Promise<number> {
  const { data } = await supabase.rpc("sitemap_director_count");
  return typeof data === "number" ? data : 0;
}

// Next calls this to learn how many sitemap files to emit. It auto-publishes a
// sitemap index at /sitemap.xml that links each /sitemap/<id>.xml.
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const [movies, directors] = await Promise.all([
    movieCount(),
    directorCount(),
  ]);
  const movieFiles = Math.max(1, Math.ceil(movies / PER_SITEMAP));
  const directorFiles = Math.ceil(directors / PER_SITEMAP);
  const total = movieFiles + directorFiles;
  return Array.from({ length: total }, (_, id) => ({ id }));
}

function staticRoutes(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/movies`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const movieFiles = Math.max(1, Math.ceil((await movieCount()) / PER_SITEMAP));

  // Movie chunk.
  if (id < movieFiles) {
    const from = id * PER_SITEMAP;
    const to = from + PER_SITEMAP - 1;
    const { data } = await supabase
      .from("movies")
      .select("tmdb_id, created_at")
      .order("tmdb_id", { ascending: true })
      .range(from, to);

    const entries: MetadataRoute.Sitemap = (data ?? []).map((row) => ({
      url: `${SITE_URL}/movie/${row.tmdb_id}`,
      lastModified: row.created_at ? new Date(row.created_at as string) : undefined,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    // Seed the homepage + catalog into the very first file.
    return id === 0 ? [...staticRoutes(), ...entries] : entries;
  }

  // Director chunk (person filmography pages).
  const directorIndex = id - movieFiles;
  const { data } = await supabase.rpc("sitemap_directors", {
    p_limit: PER_SITEMAP,
    p_offset: directorIndex * PER_SITEMAP,
  });

  return ((data ?? []) as { director: string }[]).map((row) => ({
    url: `${SITE_URL}/person/${encodeURIComponent(row.director)}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
}
