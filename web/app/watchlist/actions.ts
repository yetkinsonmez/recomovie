"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";

export async function addToWatchlist(tmdbId: number) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const { error } = await supabase
    .from("watchlist")
    .insert({ user_id: userId, tmdb_id: tmdbId });

  // 23505 = unique violation → already in the list. Treat as success.
  if (error && error.code !== "23505") return { error: error.message };

  // Keep the /watchlist revalidate (its server-rendered suggestions update on
  // every add), but skip the movie page: the button there is optimistic and
  // the movie route is dynamic, so revalidating it only forces the heavy
  // match_movies + diary re-render into this response.
  revalidatePath("/watchlist");
  return { ok: true as const };
}

export async function removeFromWatchlist(tmdbId: number) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return { ok: true as const };
}
