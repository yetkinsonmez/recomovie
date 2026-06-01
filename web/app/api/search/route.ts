import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

// Lightweight typeahead for the ⌘K command palette. Reuses the same
// search_movies RPC the /movies catalog uses (matches title, director and
// cast), just capped small for instant results.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Debounced typeahead — generous cap that only trips on scripted abuse.
  const allowed = await rateLimit("search", 90, 60);
  if (!allowed) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }

  const { data, error } = await supabase.rpc("search_movies", {
    p_q: q,
    p_genre: "",
    p_sort: "popularity",
    p_limit: 8,
    p_offset: 0,
  });

  if (error) {
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }

  const results = (data ?? []).map(
    (row: {
      tmdb_id: number;
      title: string;
      poster_url: string | null;
      release_date: string | null;
      vote_average: number | null;
    }) => ({
      tmdb_id: row.tmdb_id,
      title: row.title,
      poster_url: row.poster_url,
      release_date: row.release_date,
      vote_average: row.vote_average,
    }),
  );

  return NextResponse.json({ results });
}
