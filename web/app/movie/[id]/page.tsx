import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { MovieCard } from "@/components/MovieCard";
import { CastStrip } from "@/components/CastStrip";
import { WatchProviders } from "@/components/WatchProviders";
import { HeroTrailer } from "@/components/HeroTrailer";
import { RatingWidget } from "@/components/RatingWidget";
import { WatchlistButton } from "@/components/WatchlistButton";
import { MovieDiary } from "@/components/MovieDiary";
import { SignInGate } from "@/components/SignInGate";
import { getRatedIds } from "@/lib/userEngagement";
import type {
  MovieDetail,
  Recommendation,
  RegionProviders,
} from "@/lib/types";

function pickRegion(
  providers: Record<string, RegionProviders> | null,
): { region: string; data: RegionProviders } | null {
  if (!providers) return null;
  for (const code of ["TR", "US"]) {
    const data = providers[code];
    if (data) return { region: code, data };
  }
  const entries = Object.entries(providers);
  return entries.length ? { region: entries[0][0], data: entries[0][1] } : null;
}

function splitGenres(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();

  const { data: movie, error } = await supabase
    .from("movies")
    .select(
      "tmdb_id,title,overview,genres_text,poster_url,backdrop_url,release_date,runtime,vote_average,vote_count,tagline,director,top_cast,trailer_youtube_key,streaming_providers,mpaa_rating",
    )
    .eq("tmdb_id", tmdbId)
    .single();

  if (error || !movie) notFound();

  const film = movie as MovieDetail;
  const year = film.release_date ? film.release_date.slice(0, 4) : "";
  const backdrop = film.backdrop_url
    ? film.backdrop_url.replace(/\/w\d+\//, "/original/")
    : null;

  const eyebrowParts = [
    year,
    film.runtime ? `${film.runtime} min` : null,
    film.mpaa_rating || null,
  ].filter(Boolean) as string[];
  const eyebrow = eyebrowParts.join("  ·  ");

  const genres = splitGenres(film.genres_text);
  const region = pickRegion(film.streaming_providers ?? null);

  // Auth-aware: load the user's existing rating (if any) for this movie.
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  let userRating: number | null = null;
  let inWatchlist = false;
  if (user) {
    const [{ data: rateRow }, { data: wlRow }] = await Promise.all([
      authed
        .from("user_movie_ratings")
        .select("rating")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .maybeSingle(),
      authed
        .from("watchlist")
        .select("tmdb_id")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .maybeSingle(),
    ]);
    userRating = rateRow ? Number(rateRow.rating) : null;
    inWatchlist = !!wlRow;
  }

  const { data: recs } = await supabase.rpc("match_movies", {
    p_tmdb_id: tmdbId,
    p_count: 10,
  });
  const recommendations = (recs ?? []) as Recommendation[];

  // The set of movies this user has already rated — used to dim cards across
  // the recs grid so they don't get pushed the same things twice.
  const ratedIds = await getRatedIds();

  // Movie-level diary: most recent ratings for this film, joined with their
  // owners' public profiles. Only fetched when the viewer is signed in —
  // anonymous visitors see a locked-section prompt instead.
  type MovieDiaryItem = {
    rating: number;
    updated_at: string;
    username: string;
    avatar_id: string | null;
  };
  let movieDiary: MovieDiaryItem[] = [];
  if (user) {
    const { data: ratingRows } = await supabase
      .from("user_movie_ratings")
      .select("rating, updated_at, user_id")
      .eq("tmdb_id", tmdbId)
      .order("updated_at", { ascending: false })
      .limit(24);

    const ratingUserIds = Array.from(
      new Set((ratingRows ?? []).map((r) => r.user_id as string)),
    );

    const profileByUserId = new Map<
      string,
      { username: string | null; avatar_id: string | null }
    >();
    if (ratingUserIds.length > 0) {
      // Two-step join: no direct FK from user_movie_ratings.user_id to
      // profiles.id (both reference auth.users), so PostgREST can't embed.
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, username, avatar_id")
        .in("id", ratingUserIds);
      for (const p of profRows ?? []) {
        profileByUserId.set(p.id as string, {
          username: (p.username ?? null) as string | null,
          avatar_id: (p.avatar_id ?? null) as string | null,
        });
      }
    }

    movieDiary = (ratingRows ?? [])
      .map((r) => {
        const p = profileByUserId.get(r.user_id as string);
        if (!p?.username) return null;
        return {
          rating: Number(r.rating),
          updated_at: r.updated_at as string,
          username: p.username,
          avatar_id: p.avatar_id,
        };
      })
      .filter((e): e is MovieDiaryItem => !!e)
      .slice(0, 12);
  }

  return (
    <main>
      <section className={backdrop ? "movie-hero has-backdrop" : "movie-hero"}>
        {backdrop && (
          <Image
            className="movie-hero-bg"
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            priority
          />
        )}
        {film.trailer_youtube_key && (
          <HeroTrailer videoKey={film.trailer_youtube_key} title={film.title} />
        )}
        <div className="movie-hero-scrim" />
        <div className="movie-hero-inner">
          <Link href="/" className="back">
            ← All movies
          </Link>

          <div className="movie-hero-body">
            <div className="detail-poster">
              {film.poster_url ? (
                <Image
                  src={film.poster_url}
                  alt={film.title}
                  fill
                  sizes="(max-width: 768px) 60vw, 320px"
                  priority
                />
              ) : (
                <div className="poster-empty">No image</div>
              )}
            </div>

            <div className="detail-info">
              {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
              <h1 className="hero-title">{film.title}</h1>
              {film.tagline && (
                <p className="hero-tagline">“{film.tagline}”</p>
              )}
              <div className="hero-meta-row">
                {film.director && (
                  <span className="hero-director">
                    <span className="muted-prefix">Directed by</span>{" "}
                    {film.director}
                  </span>
                )}
                {film.vote_average ? (
                  <span className="rating-pill">
                    ★ {film.vote_average.toFixed(1)}
                    {film.vote_count ? (
                      <span className="rating-pill-count">
                        {" "}· {film.vote_count.toLocaleString()} votes
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {genres.length > 0 && (
                <div className="genre-pills">
                  {genres.map((genre) => (
                    <span key={genre} className="genre-pill">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="overview-row">
          {film.overview ? (
            <p className="overview">{film.overview}</p>
          ) : (
            <div />
          )}
          <aside className="overview-aside">
            <RatingWidget
              tmdbId={tmdbId}
              initialRating={userRating}
              isSignedIn={!!user}
            />
            <WatchlistButton
              tmdbId={tmdbId}
              initialInList={inWatchlist}
              isSignedIn={!!user}
            />
          </aside>
        </div>

        {/* Cast (left) + Where to watch (right, compact square card). One
            row keeps the page tighter — the watch panel is narrow so the
            cast strip has room. Falls back to single-column on narrow
            viewports. */}
        {(film.top_cast?.length || region) && (
          <div className="cast-watch-row">
            {film.top_cast && film.top_cast.length > 0 ? (
              <section className="detail-section cast-watch-cast">
                <h2>Cast</h2>
                <CastStrip cast={film.top_cast} />
              </section>
            ) : (
              <div />
            )}
            {region && (
              <section className="detail-section cast-watch-watch">
                <h2>Where to watch</h2>
                <div className="watch-square">
                  <WatchProviders
                    providers={region.data}
                    region={region.region}
                    title={film.title}
                    releaseYear={year}
                  />
                </div>
              </section>
            )}
          </div>
        )}

        <section className="detail-section">
          <h2>Recent ratings</h2>
          {!user ? (
            <SignInGate
              label="See what other viewers thought"
              nextPath={`/movie/${tmdbId}`}
            />
          ) : movieDiary.length === 0 ? (
            <p className="meta">No ratings yet — be the first.</p>
          ) : (
            <MovieDiary entries={movieDiary} />
          )}
        </section>


        <section className="detail-section">
          <h2>Movies with a similar story</h2>
          {recommendations.length === 0 ? (
            <p className="error">No recommendations available.</p>
          ) : (
            <section className="grid">
              {recommendations.map((rec) => (
                <MovieCard
                  key={rec.tmdb_id}
                  movie={rec}
                  isRated={ratedIds.has(rec.tmdb_id)}
                />
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
