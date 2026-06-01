import { Suspense } from "react";
import { unstable_cache } from "next/cache";
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
import { MovieDiaryRowSkeleton } from "@/components/Skeletons";
import { getRatedIds } from "@/lib/userEngagement";
import { getCurrentUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/siteUrl";
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

const MOVIE_SELECT =
  "tmdb_id,title,overview,genres_text,poster_url,backdrop_url,release_date,runtime,vote_average,vote_count,tagline,director,top_cast,trailer_youtube_key,streaming_providers,mpaa_rating";

// ── Cached, per-movie static data ────────────────────────────────────────────
// The movie row and its recommendations are the same for every viewer and
// rarely change (the row only drifts a cosmetic vote_count/avg when someone
// rates it). Both are keyed by tmdb_id and cached for a day, so repeat/popular
// pages skip the DB entirely — most importantly the heavy pgvector match_movies
// RPC. The per-viewer bits (rating, watchlist, diary, rec-dimming) are fetched
// separately and streamed via Suspense. generateMetadata shares getMovieRow, so
// the row is fetched at most once per cache-miss request.
function getMovieRow(tmdbId: number) {
  return unstable_cache(
    async (): Promise<MovieDetail | null> => {
      const { data } = await supabase
        .from("movies")
        .select(MOVIE_SELECT)
        .eq("tmdb_id", tmdbId)
        .maybeSingle();
      return (data as MovieDetail | null) ?? null;
    },
    ["movie-row", String(tmdbId)],
    { revalidate: 86400, tags: [`movie-${tmdbId}`] },
  )();
}

function getRecommendations(tmdbId: number) {
  return unstable_cache(
    async (): Promise<Recommendation[]> => {
      const { data } = await supabase.rpc("match_movies", {
        p_tmdb_id: tmdbId,
        p_count: 10,
      });
      return (data ?? []) as Recommendation[];
    },
    ["movie-recs", String(tmdbId)],
    { revalidate: 86400, tags: [`movie-${tmdbId}`] },
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) return {};

  const data = await getMovieRow(tmdbId);
  if (!data) return {};

  const year = data.release_date ? data.release_date.slice(0, 4) : null;
  const title = year ? `${data.title} (${year}) — recomovie` : `${data.title} — recomovie`;
  const description =
    data.tagline ||
    (data.overview?.slice(0, 180) ?? null) ||
    "Find films matched on plot, theme and tone — not just genre.";
  // Prefer the wider backdrop for social previews; fall back to poster.
  const image = data.backdrop_url ?? data.poster_url;
  const ogImages = image
    ? [{ url: image, width: 1280, height: 720, alt: data.title }]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/movie/${tmdbId}`,
    },
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

  // Both are cached per movie, so this is a DB hit only on a cache miss.
  const [film, recommendations] = await Promise.all([
    getMovieRow(tmdbId),
    getRecommendations(tmdbId),
  ]);
  if (!film) notFound();

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

  // Schema.org Movie markup → rich results (rating stars, cast) in Google.
  // Only emit aggregateRating when there are actual votes, otherwise Google
  // flags an invalid/empty rating.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: film.title,
    url: `${SITE_URL}/movie/${tmdbId}`,
    ...(film.poster_url ? { image: film.poster_url } : {}),
    ...(film.overview ? { description: film.overview } : {}),
    ...(film.release_date ? { datePublished: film.release_date } : {}),
    ...(genres.length ? { genre: genres } : {}),
    ...(film.runtime ? { duration: `PT${film.runtime}M` } : {}),
    ...(film.mpaa_rating ? { contentRating: film.mpaa_rating } : {}),
    ...(film.director
      ? { director: { "@type": "Person", name: film.director } }
      : {}),
    ...(film.top_cast && film.top_cast.length
      ? {
          actor: film.top_cast.slice(0, 8).map((c) => ({
            "@type": "Person",
            name: c.name,
          })),
        }
      : {}),
    ...(film.vote_average && film.vote_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: film.vote_average.toFixed(1),
            ratingCount: film.vote_count,
            bestRating: 10,
            worstRating: 0,
          },
        }
      : {}),
  };

  return (
    <main>
      {/* Escape `<` so a title containing `</script>` can't break out of the
          tag. JSON-LD only ever contains `<` inside string values, so this is
          safe and standard for inlined ld+json. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
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
            {/* Per-viewer cards stream in; the static "Where to watch" renders
                immediately below them. */}
            <Suspense fallback={<UserActionsSkeleton />}>
              <UserActions tmdbId={tmdbId} />
            </Suspense>

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
          <h2>Ratings &amp; comments</h2>
          <Suspense fallback={<DiarySkeleton />}>
            <DiarySection tmdbId={tmdbId} />
          </Suspense>
        </Reveal>


        <Reveal as="section" className="detail-section">
          <h2>Movies with a similar story</h2>
          {recommendations.length === 0 ? (
            <p className="error">No recommendations available.</p>
          ) : (
            <Suspense
              fallback={<RecGridView recs={recommendations} ratedIds={EMPTY_RATED} />}
            >
              <RecommendationsGrid recs={recommendations} />
            </Suspense>
          )}
        </Reveal>
      </div>
    </main>
  );
}

// ── Streamed, per-viewer sections ────────────────────────────────────────────

type MovieDiaryItem = {
  rating: number;
  updated_at: string;
  username: string;
  avatar_url: string | null;
  user_id: string;
  comment: string | null;
  is_spoiler: boolean;
  reactions: Record<ReactionCode, number>;
  viewer_reaction: ReactionCode | null;
};

const EMPTY_RATED: Set<number> = new Set();

function UserActionsSkeleton() {
  return (
    <>
      <section className="cw-card">
        <h3 className="cw-card-title">Your rating</h3>
        <div className="sk" style={{ height: 56, borderRadius: 12 }} />
      </section>
      <section className="cw-card">
        <h3 className="cw-card-title">Watchlist</h3>
        <div className="sk" style={{ height: 44, borderRadius: 12 }} />
      </section>
    </>
  );
}

// The viewer's own rating + watchlist state for this film. Uses the cookie
// (createClient) client so RLS scopes to the signed-in user.
async function UserActions({ tmdbId }: { tmdbId: number }) {
  const user = await getCurrentUser();

  let userRating: number | null = null;
  let userComment: string | null = null;
  let userSpoiler = false;
  let inWatchlist = false;

  if (user) {
    const authed = await createClient();
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

  return (
    <>
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
    </>
  );
}

function DiarySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <MovieDiaryRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Movie-level diary: most recent ratings for this film, joined with their
// owners' public profiles and reaction tallies. All public data, so the anon
// client is fine; the viewer's own reaction is found by matching user.id.
async function DiarySection({ tmdbId }: { tmdbId: number }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <SignInGate
        label="See what other viewers thought"
        nextPath={`/movie/${tmdbId}`}
      />
    );
  }

  const { data: ratingRows } = await supabase
    .from("user_movie_ratings")
    .select("rating, comment, comment_spoiler, updated_at, user_id")
    .eq("tmdb_id", tmdbId)
    .order("updated_at", { ascending: false })
    .limit(40);

  const ratingUserIds = Array.from(
    new Set((ratingRows ?? []).map((r) => r.user_id as string)),
  );

  const profileByUserId = new Map<
    string,
    { username: string | null; avatar_url: string | null }
  >();
  const reactionCounts = new Map<string, Record<ReactionCode, number>>();
  const viewerReaction = new Map<string, ReactionCode | null>();

  if (ratingUserIds.length > 0) {
    // profiles and reactions both only depend on ratingUserIds and are
    // independent of each other — fetch them in parallel.
    const [profRes, reactRes] = await Promise.all([
      // Two-step join: no direct FK from user_movie_ratings.user_id to
      // profiles.id (both reference auth.users), so PostgREST can't embed.
      supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ratingUserIds),
      supabase
        .from("rating_comment_reactions")
        .select("rating_user_id, user_id, reaction")
        .eq("tmdb_id", tmdbId)
        .in("rating_user_id", ratingUserIds),
    ]);

    for (const p of profRes.data ?? []) {
      profileByUserId.set(p.id as string, {
        username: (p.username ?? null) as string | null,
        avatar_url: (p.avatar_url ?? null) as string | null,
      });
    }

    for (const r of reactRes.data ?? []) {
      const code = r.reaction as ReactionCode;
      if (!isReactionCode(code)) continue;
      const key = r.rating_user_id as string;
      const cur = reactionCounts.get(key) ?? emptyReactionCounts();
      cur[code] += 1;
      reactionCounts.set(key, cur);
      if (r.user_id === user.id) viewerReaction.set(key, code);
    }
  }

  const movieDiary = (ratingRows ?? [])
    .map((r) => {
      const p = profileByUserId.get(r.user_id as string);
      if (!p?.username) return null;
      return {
        rating: Number(r.rating),
        updated_at: r.updated_at as string,
        username: p.username,
        avatar_url: p.avatar_url,
        user_id: r.user_id as string,
        comment: (r.comment as string | null) ?? null,
        is_spoiler: !!r.comment_spoiler,
        reactions:
          reactionCounts.get(r.user_id as string) ?? emptyReactionCounts(),
        viewer_reaction: viewerReaction.get(r.user_id as string) ?? null,
      };
    })
    .filter((e): e is MovieDiaryItem => !!e)
    .slice(0, 30);

  if (movieDiary.length === 0) {
    return <p className="meta">No ratings yet — be the first.</p>;
  }

  return (
    <MovieDiary
      entries={movieDiary}
      tmdbId={tmdbId}
      viewerId={user.id}
      isSignedIn
    />
  );
}

function RecGridView({
  recs,
  ratedIds,
}: {
  recs: Recommendation[];
  ratedIds: Set<number>;
}) {
  return (
    <section className="grid">
      {recs.map((rec) => (
        <MovieCard
          key={rec.tmdb_id}
          movie={rec}
          isRated={ratedIds.has(rec.tmdb_id)}
        />
      ))}
    </section>
  );
}

// Recs render instantly from cached data; the only per-viewer part is dimming
// already-rated cards, so the Suspense fallback is the same grid undimmed.
async function RecommendationsGrid({ recs }: { recs: Recommendation[] }) {
  const ratedIds = await getRatedIds();
  return <RecGridView recs={recs} ratedIds={ratedIds} />;
}
