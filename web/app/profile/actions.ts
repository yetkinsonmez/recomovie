"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BY_ID } from "@/lib/avatars";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const HOT_TAKE_MAX = 180;

export async function updateUsername(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const username = String(formData.get("username") ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return { error: "3–20 chars: letters, numbers, underscore" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") return { error: "That username is taken" };
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateHotTake(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const raw = String(formData.get("hot_take") ?? "").trim();
  const value = raw ? raw.slice(0, HOT_TAKE_MAX) : null;

  const { error } = await supabase
    .from("profiles")
    .update({ hot_take: value })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const avatarId = String(formData.get("avatar_id") ?? "");
  if (!AVATAR_BY_ID.has(avatarId)) return { error: "Unknown avatar" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_id: avatarId })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addFavorite(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Append to the end of the list.
  const { count } = await supabase
    .from("favorite_movies")
    .select("tmdb_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("favorite_movies").insert({
    user_id: user.id,
    tmdb_id: tmdbId,
    position: count ?? 0,
  });

  if (error && error.code !== "23505") {
    if (error.message?.includes("favorites_limit_exceeded")) {
      return { error: "You can only have 4 favorites — remove one first." };
    }
    return { error: error.message };
  }
  revalidatePath("/profile");
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}

export async function removeFavorite(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("favorite_movies")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}
