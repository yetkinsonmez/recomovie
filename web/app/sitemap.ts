import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/siteUrl";
import {
  PER_SITEMAP,
  sitemapMovieCount,
  sitemapChunkCounts,
} from "@/lib/sitemapChunks";

export const revalidate = 86400; // regenerate at most once a day

// Next calls this to learn how many sitemap files to emit, serving each at
// /sitemap/<id>.xml. NOTE: it does NOT publish a sitemap index at /sitemap.xml
// — that lives in app/sitemap_index.xml/route.ts, which robots.txt points at.
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const { total } = await sitemapChunkCounts();
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
  const movieFiles = Math.max(
    1,
    Math.ceil((await sitemapMovieCount()) / PER_SITEMAP),
  );

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
