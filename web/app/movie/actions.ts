"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VALID_RATINGS = new Set(
  Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5),
);

export async function rateMovie(tmdbId: number, rating: number) {
  if (!VALID_RATINGS.has(rating)) return { error: "Invalid rating" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Upsert — also bumps updated_at via trigger on UPDATE path.
  const { error } = await supabase.from("user_movie_ratings").upsert(
    {
      user_id: user.id,
      tmdb_id: tmdbId,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function removeRating(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("user_movie_ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };
  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath("/profile");
  return { ok: true as const };
}
