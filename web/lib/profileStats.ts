// Server-side data layer for profile stats. Pulls a user's ratings (joined to
// movie metadata) plus a couple of counts, then hands them to the pure compute
// functions in lib/stats.ts. Shared by the owner profile and the public
// /u/[username] page so both render identical numbers.
import type { createClient } from "@/lib/supabase/server";
import {
  computeBadges,
  computeCriticProfile,
  countAuteurFilms,
  maxDistinctGenresInAMonth,
  parseGenres,
  type Badge,
  type GenreStat,
  type RatingDatum,
} from "@/lib/stats";
import { getBadgeRarities } from "@/lib/badgeRarity";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ProfileStats {
  ratedCount: number;
  critic: GenreStat[];
  badges: Badge[];
}

// Cap on ratings pulled for the genre/auteur/month aggregations. Volume badges
// use the exact head-count instead, so this only bounds the analytical work.
const ANALYSIS_LIMIT = 2000;

export async function getProfileStats(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ProfileStats> {
  const [ratingsRes, countRes, likesRes, rarities] = await Promise.all([
    supabase
      .from("user_movie_ratings")
      .select(
        `rating, updated_at, movies:tmdb_id ( vote_average, genres_text, director )`,
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(ANALYSIS_LIMIT),
    // Exact total rating count (head request — no rows transferred).
    supabase
      .from("user_movie_ratings")
      .select("tmdb_id", { count: "exact", head: true })
      .eq("user_id", userId),
    // Emoji reactions received across all of this user's comments.
    supabase
      .from("rating_comment_reactions")
      .select("user_id", { count: "exact", head: true })
      .eq("rating_user_id", userId),
    // Global earned-rate per badge — cached, identical for every viewer.
    getBadgeRarities(),
  ]);

  const data: RatingDatum[] = (ratingsRes.data ?? [])
    .map((r) => {
      const movie = Array.isArray(r.movies) ? r.movies[0] : r.movies;
      if (!movie) return null;
      return {
        rating: Number(r.rating),
        voteAverage:
          movie.vote_average == null ? null : Number(movie.vote_average),
        genres: parseGenres(movie.genres_text as string | null),
        director: (movie.director as string | null) ?? null,
        ratedAt: r.updated_at as string,
      } satisfies RatingDatum;
    })
    .filter((d): d is RatingDatum => d !== null);

  const ratedCount = countRes.count ?? data.length;
  const commentLikes = likesRes.count ?? 0;

  const critic = computeCriticProfile(data);
  const badges = computeBadges({
    ratedCount,
    auteurCount: countAuteurFilms(data),
    maxGenresInMonth: maxDistinctGenresInAMonth(data),
    commentLikes,
  }).map((b) => ({ ...b, rarity: rarities[b.id] }));

  return { ratedCount, critic, badges };
}
