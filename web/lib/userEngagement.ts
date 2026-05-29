import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side helper: returns the set of tmdb_ids the currently signed-in
 * user has rated. Empty set for anonymous visitors.
 *
 * Used to visually dim already-watched movies in catalog and rec grids — the
 * user has already engaged with these, so we don't want to highlight them.
 */
export async function getRatedIds(): Promise<Set<number>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const supabase = await createClient();

  const { data } = await supabase
    .from("user_movie_ratings")
    .select("tmdb_id")
    .eq("user_id", user.id);

  return new Set((data ?? []).map((r) => r.tmdb_id as number));
}
