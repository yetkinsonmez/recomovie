import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { VibeSearch } from "@/components/VibeSearch";
import { VibeResults } from "@/components/VibeResults";
import { HomeFeedSection } from "@/components/HomeFeedSection";
import { Reveal } from "@/components/Reveal";
import { getRatedIds } from "@/lib/userEngagement";
import type { Movie } from "@/lib/types";

export const revalidate = 600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string }>;
}) {
  const sp = await searchParams;
  const mood = (sp.mood ?? "").trim();

  if (mood) {
    return (
      <main className="container">
        <VibeSearch compact />
        <VibeResults mood={mood} />
      </main>
    );
  }

  // Auth check controls which feed sections we render below the hero.
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();

  // Hot This Week is public — runs the RPC with anon client (cached at the
  // page level via `revalidate`). 6 movies, leaderboard of recent rating
  // activity.
  const { data: hotRows } = await supabase.rpc("hot_movies_this_week", {
    p_count: 6,
  });
  const hot: Movie[] = (hotRows ?? []) as Movie[];

  // For You + Because You Rated only render for signed-in users with at
  // least one rating. The taste vector RPC handles the cold-start case
  // (returns empty), which we then convert to an onboarding nudge.
  let forYou: Movie[] = [];
  let seedTitle: string | null = null;
  let becauseRecs: Movie[] = [];
  let totalRatings = 0;
  let ratedIds: Set<number> = new Set();

  if (user) {
    ratedIds = await getRatedIds();
    totalRatings = ratedIds.size;

    if (totalRatings > 0) {
      // Seed for "Because you rated …": pick a random film from everything
      // this user has rated — not just their highest. Fresh seed on each
      // render keeps the carousel feeling alive between visits.
      const [forYouRes, ratedListRes] = await Promise.all([
        authed.rpc("match_movies_for_user", {
          p_user_id: user.id,
          p_count: 12,
          p_min_rating: 6.0,
        }),
        authed
          .from("user_movie_ratings")
          .select(`tmdb_id, movies:tmdb_id ( title )`)
          .eq("user_id", user.id),
      ]);

      forYou = (forYouRes.data ?? []) as Movie[];

      const ratedList = (ratedListRes.data ?? []) as Array<{
        tmdb_id: number;
        movies: { title: string } | { title: string }[] | null;
      }>;

      if (ratedList.length > 0) {
        const pick = ratedList[Math.floor(Math.random() * ratedList.length)];
        const m = Array.isArray(pick.movies) ? pick.movies[0] : pick.movies;
        seedTitle = m?.title ?? null;
        const { data: simRows } = await supabase.rpc("match_movies", {
          p_tmdb_id: pick.tmdb_id,
          p_count: 12,
        });
        // Strip anything the user already rated.
        becauseRecs = ((simRows ?? []) as Movie[]).filter(
          (rec) => !ratedIds.has(rec.tmdb_id),
        );
      }
    }
  }

  return (
    <main>
      <section className="landing">
        <div className="landing-orb landing-orb-1" aria-hidden="true" />
        <div className="landing-orb landing-orb-2" aria-hidden="true" />
        <div className="landing-inner">
          <p className="landing-eyebrow">✦ Theme-matched movie discovery</p>
          <h1 className="landing-title">
            What do you feel like
            <br />
            <span className="landing-grad">watching tonight?</span>
          </h1>
          <p className="landing-sub">
            Describe a mood, a plot, a vibe — recomovie finds the film that fits
            the feeling, not just the genre.
          </p>
          <VibeSearch />
          <p className="landing-scroll-hint" aria-hidden="true">
            ↓ Or scroll for what's hot this week
          </p>
        </div>
      </section>

      <div className="container home-feed">
        <Reveal>
          <HomeFeedSection
            title={
              <>
                <span className="landing-grad">Hot</span> this week
              </>
            }
            meta="Most-rated films right now"
            movies={hot}
            ratedIds={ratedIds}
            emptyHint="No ratings recorded in the last week yet — be the first to rate something."
          />
        </Reveal>

        {user && totalRatings === 0 && (
          <Reveal>
            <section className="home-feed-section">
              <header className="home-feed-head">
                <p className="catalog-eyebrow">For you</p>
                <h2 className="home-feed-title">
                  <span className="landing-grad">Rate a few films</span>
                </h2>
              </header>
              <p className="meta home-feed-empty">
                Rate 3+ films and we'll build a personalised feed for you here.{" "}
                <Link href="/movies" className="link-accent">
                  Browse the catalog →
                </Link>
              </p>
            </section>
          </Reveal>
        )}

        {user && forYou.length > 0 && (
          <Reveal>
            <HomeFeedSection
              eyebrow="Personalised"
              title={
                <>
                  <span className="landing-grad">For you</span>
                </>
              }
              meta={`Based on ${totalRatings} ${totalRatings === 1 ? "rating" : "ratings"}`}
              movies={forYou.slice(0, 12)}
              ratedIds={ratedIds}
            />
          </Reveal>
        )}

        {user && seedTitle && becauseRecs.length > 0 && (
          <Reveal>
            <HomeFeedSection
              title={
                <>
                  Because you rated{" "}
                  <span className="landing-grad">{seedTitle}</span>
                </>
              }
              movies={becauseRecs.slice(0, 12)}
              ratedIds={ratedIds}
            />
          </Reveal>
        )}
      </div>
    </main>
  );
}
