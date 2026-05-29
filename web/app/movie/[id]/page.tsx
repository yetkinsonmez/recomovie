import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
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
import { Reveal } from "@/components/Reveal";
import { BackLink } from "@/components/BackLink";
import { getRatedIds } from "@/lib/userEngagement";
import { getCurrentUser } from "@/lib/auth";
import {
  emptyReactionCounts,
  isReactionCode,
  type ReactionCode,
} from "@/lib/reactions";
import type {
  MovieDetail,
  Recommendation,
  RegionProviders,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) return {};

  const { data } = await supabase
    .from("movies")
    .select("title, overview, release_date, poster_url, backdrop_url, tagline")
    .eq("tmdb_id", tmdbId)
    .single();
  if (!data) return {};

  const year = data.release_date ? data.release_date.slice(0, 4) : null;
  const title = year ? `${data.title} (${year}) — recomovie` : `${data.title} — recomovie`;
  const description =
    (data.tagline as string | null) ||
    ((data.overview as string | null)?.slice(0, 180) ?? null) ||
    "Find films matched on plot, theme and tone — not just genre.";
  // Prefer the wider backdrop for social previews; fall back to poster.
  const image = (data.backdrop_url as string | null) ?? (data.poster_url as string | null);
  const ogImages = image
    ? [{ url: image, width: 1280, height: 720, alt: data.title as string }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

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

  // These three are independent — the movie row and recommendations only need
  // the tmdb id, and the auth lookup needs neither. Fire them together so the
  // slowest (the pgvector recs RPC) overlaps with everything else instead of
  // queuing behind it.
  const [movieRes, recsRes, user] = await Promise.all([
    supabase
      .from("movies")
      .select(
        "tmdb_id,title,overview,genres_text,poster_url,backdrop_url,release_date,runtime,vote_average,vote_count,tagline,director,top_cast,trailer_youtube_key,streaming_providers,mpaa_rating",
      )
      .eq("tmdb_id", tmdbId)
      .single(),
    supabase.rpc("match_movies", { p_tmdb_id: tmdbId, p_count: 10 }),
    getCurrentUser(),
  ]);

  const { data: movie, error } = movieRes;
  if (error || !movie) notFound();

  const recommendations = (recsRes.data ?? []) as Recommendation[];

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
  let userRating: number | null = null;
  let userComment: string | null = null;
  let userSpoiler = false;
  let inWatchlist = false;
  if (user) {
    const [{ data: rateRow }, { data: wlRow }] = await Promise.all([
      authed
        .from("user_movie_ratings")
        .select("rating, comment, comment_spoiler")
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
    userComment = rateRow ? ((rateRow.comment as string | null) ?? null) : null;
    userSpoiler = rateRow ? !!rateRow.comment_spoiler : false;
    inWatchlist = !!wlRow;
  }

  // The set of movies this user has already rated — used to dim cards across
  // the recs grid so they don't get pushed the same things twice. Reuses the
  // request-cached user, so no extra auth round-trip.
  const ratedIds = await getRatedIds();

  // Movie-level diary: most recent ratings for this film, joined with their
  // owners' public profiles. Only fetched when the viewer is signed in —
  // anonymous visitors see a locked-section prompt instead.
  type MovieDiaryItem = {
    rating: number;
    updated_at: string;
    username: string;
    avatar_id: string | null;
    user_id: string;
    comment: string | null;
    is_spoiler: boolean;
    reactions: Record<ReactionCode, number>;
    viewer_reaction: ReactionCode | null;
  };
  let movieDiary: MovieDiaryItem[] = [];
  if (user) {
    const { data: ratingRows } = await supabase
      .from("user_movie_ratings")
      .select("rating, comment, comment_spoiler, updated_at, user_id")
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

    // Reactions for these ratings on this movie: per-emoji counts keyed by the
    // commenter, plus whichever emoji the viewer themselves left.
    const reactionCounts = new Map<string, Record<ReactionCode, number>>();
    const viewerReaction = new Map<string, ReactionCode | null>();
    if (ratingUserIds.length > 0) {
      const { data: reactRows } = await supabase
        .from("rating_comment_reactions")
        .select("rating_user_id, user_id, reaction")
        .eq("tmdb_id", tmdbId)
        .in("rating_user_id", ratingUserIds);
      for (const r of reactRows ?? []) {
        const code = r.reaction as ReactionCode;
        if (!isReactionCode(code)) continue;
        const key = r.rating_user_id as string;
        const cur = reactionCounts.get(key) ?? emptyReactionCounts();
        cur[code] += 1;
        reactionCounts.set(key, cur);
        if (r.user_id === user.id) viewerReaction.set(key, code);
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
          user_id: r.user_id as string,
          comment: (r.comment as string | null) ?? null,
          is_spoiler: !!r.comment_spoiler,
          reactions:
            reactionCounts.get(r.user_id as string) ?? emptyReactionCounts(),
          viewer_reaction: viewerReaction.get(r.user_id as string) ?? null,
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
          <BackLink fallbackHref="/movies" fallbackLabel="All movies" />

          <div className="movie-hero-body">
            <div
              className="detail-poster"
              style={{ viewTransitionName: `poster-${tmdbId}` } as React.CSSProperties}
            >
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
                    <Link
                      href={`/person/${encodeURIComponent(film.director)}`}
                      className="hero-director-link"
                    >
                      {film.director}
                    </Link>
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
                    <Link
                      key={genre}
                      href={`/movies?genre=${encodeURIComponent(genre)}`}
                      className="genre-pill"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Two-column layout starting right under the hero. Left: overview
            then cast. Right: rating, watchlist, where-to-watch stacked into
            equal-width compact cards. Single column on narrow viewports. */}
        <div className="cast-watch-row">
          <div className="cast-watch-main">
            {film.overview && (
              <p className="overview">{film.overview}</p>
            )}
            {film.top_cast && film.top_cast.length > 0 && (
              <Reveal as="section" className="detail-section cast-watch-cast">
                <h2>Cast</h2>
                <CastStrip cast={film.top_cast.slice(0, 8)} />
              </Reveal>
            )}
          </div>

          <aside className="cast-watch-aside">
            <section className="cw-card">
              <h3 className="cw-card-title">Your rating</h3>
              <RatingWidget
                tmdbId={tmdbId}
                initialRating={userRating}
                initialComment={userComment}
                initialSpoiler={userSpoiler}
                isSignedIn={!!user}
              />
            </section>

            <section className="cw-card">
              <h3 className="cw-card-title">Watchlist</h3>
              <WatchlistButton
                tmdbId={tmdbId}
                initialInList={inWatchlist}
                isSignedIn={!!user}
              />
            </section>

            {region && (
              <section className="cw-card">
                <h3 className="cw-card-title">Where to watch</h3>
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
          </aside>
        </div>

        <Reveal as="section" className="detail-section">
          <h2>Recent ratings</h2>
          {!user ? (
            <SignInGate
              label="See what other viewers thought"
              nextPath={`/movie/${tmdbId}`}
            />
          ) : movieDiary.length === 0 ? (
            <p className="meta">No ratings yet — be the first.</p>
          ) : (
            <MovieDiary
              entries={movieDiary}
              tmdbId={tmdbId}
              viewerId={user?.id ?? null}
              isSignedIn={!!user}
            />
          )}
        </Reveal>


        <Reveal as="section" className="detail-section">
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
        </Reveal>
      </div>
    </main>
  );
}
