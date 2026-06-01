"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { isReactionCode, type ReactionCode } from "@/lib/reactions";

const VALID_RATINGS = new Set(
  Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5),
);

const COMMENT_MAX = 2000;

function normalizeComment(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > COMMENT_MAX) return trimmed.slice(0, COMMENT_MAX);
  return trimmed;
}

export async function rateMovie(
  tmdbId: number,
  rating: number,
  comment?: string | null,
  spoiler = false,
) {
  if (!VALID_RATINGS.has(rating)) return { error: "Invalid rating" };

  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const cleanComment = normalizeComment(comment);

  // Upsert — also bumps updated_at via trigger on UPDATE path. A spoiler flag
  // only makes sense when there's actually a comment.
  const { error } = await supabase.from("user_movie_ratings").upsert(
    {
      user_id: userId,
      tmdb_id: tmdbId,
      rating,
      comment: cleanComment,
      comment_spoiler: cleanComment ? spoiler : false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id" },
  );

  if (error) return { error: error.message };
  // No revalidatePath: the rating widget updates optimistically, and the movie
  // page is a dynamic (cookie-bound) route so it re-renders fresh on the next
  // visit anyway. Revalidating here would only force the heavy match_movies
  // RPC + diary re-render into this action's response — the rating lag.
  return { ok: true as const };
}

// Update just the comment text. Requires an existing rating row — enforces
// the "no comment without a rating" rule at the data layer.
export async function setRatingComment(
  tmdbId: number,
  comment: string | null,
  spoiler = false,
) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const cleanComment = normalizeComment(comment);

  const { data, error } = await supabase
    .from("user_movie_ratings")
    .update({
      comment: cleanComment,
      comment_spoiler: cleanComment ? spoiler : false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .select("user_id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Rate the film before leaving a comment." };
  }
  // Keep the movie-page revalidate here (but not /profile): writing a comment
  // is a deliberate, infrequent action and the user expects it to show up in
  // the "Recent ratings" diary right away. The star-rating hot path skips this.
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}

export async function removeRating(tmdbId: number) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const { error } = await supabase
    .from("user_movie_ratings")
    .delete()
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };
  // Optimistic widget clears the stars; dynamic route refreshes the diary on
  // the next visit. Skip the revalidate to keep removal snappy.
  return { ok: true as const };
}

// reaction: an emoji code (see lib/reactions.ts) to set, or null to clear.
export async function setCommentReaction(
  ratingUserId: string,
  tmdbId: number,
  reaction: ReactionCode | null,
) {
  if (reaction !== null && !isReactionCode(reaction)) {
    return { error: "Invalid reaction" };
  }

  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };
  if (userId === ratingUserId) {
    return { error: "You can't react to your own comment." };
  }

  if (reaction === null) {
    const { error } = await supabase
      .from("rating_comment_reactions")
      .delete()
      .eq("user_id", userId)
      .eq("rating_user_id", ratingUserId)
      .eq("tmdb_id", tmdbId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("rating_comment_reactions").upsert(
      {
        user_id: userId,
        rating_user_id: ratingUserId,
        tmdb_id: tmdbId,
        reaction,
      },
      { onConflict: "user_id,rating_user_id,tmdb_id" },
    );
    if (error) return { error: error.message };
  }

  // CommentReactions updates optimistically; the dynamic route shows the
  // authoritative tally on the next visit. No revalidate → no reaction lag.
  return { ok: true as const };
}
