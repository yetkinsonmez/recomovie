import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  WatchlistGrid,
  type WatchlistEntry,
} from "@/components/WatchlistGrid";
import { WatchlistSuggestions } from "@/components/WatchlistSuggestions";
import type { Recommendation } from "@/lib/types";
import { getRatedIds } from "@/lib/userEngagement";

// Per-user data — always render fresh on the server.
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Sign in to see your watchlist");

  const { data: wlRows } = await supabase
    .from("watchlist")
    .select(
      `added_at, tmdb_id, movies:tmdb_id (
        tmdb_id, title, poster_url, release_date, vote_average, genres_text
      )`,
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const entries: WatchlistEntry[] = (wlRows ?? [])
    .map((r) => {
      const m = Array.isArray(r.movies) ? r.movies[0] : r.movies;
      if (!m) return null;
      return { ...m, added_at: r.added_at as string } as WatchlistEntry;
    })
    .filter((e): e is WatchlistEntry => !!e);

  // Suggestions are the nearest neighbours of the watchlist's centroid — empty
  // list when the watchlist is empty.
  const { data: suggestRows } =
    entries.length > 0
      ? await supabase.rpc("suggest_for_watchlist", { p_count: 14 })
      : { data: [] as Recommendation[] };
  const suggestions = (suggestRows ?? []) as Recommendation[];

  const ratedIds = Array.from(await getRatedIds());

  return (
    <main className="container watchlist-page">
      <header className="catalog-hero">
        <span className="catalog-hero-orb catalog-hero-orb-1" aria-hidden="true" />
        <span className="catalog-hero-orb catalog-hero-orb-2" aria-hidden="true" />
        <p className="catalog-eyebrow">Personal queue</p>
        <h1>Your watchlist</h1>
        <p>
          Films you want to watch — filter, sort, and let recomovie suggest
          more in the same vein.
        </p>
      </header>

      <section className="catalog-shell">
        <WatchlistGrid initial={entries} ratedIds={ratedIds} />
      </section>

      <section className="wl-suggest-section">
        <header className="wl-suggest-header">
          <div>
            <p className="catalog-eyebrow">For you</p>
            <h2 className="wl-suggest-title-h">
              <span className="landing-grad">More like your watchlist</span>
            </h2>
          </div>
          <p className="meta wl-suggest-sub">
            Updates every time you add a film.
          </p>
        </header>
        <WatchlistSuggestions suggestions={suggestions} ratedIds={ratedIds} />
      </section>
    </main>
  );
}
