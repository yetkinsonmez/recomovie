"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addToWatchlist(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("watchlist")
    .insert({ user_id: user.id, tmdb_id: tmdbId });

  // 23505 = unique violation → already in the list. Treat as success.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/watchlist");
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}

export async function removeFromWatchlist(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}
