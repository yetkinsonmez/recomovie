"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const HOT_TAKE_MAX = 180;

// Path inside the avatars bucket where a user's photo lives. The folder is the
// user id, which the storage RLS policies key ownership on.
const AVATAR_OBJECT = (userId: string) => `${userId}/avatar.webp`;

export async function updateUsername(formData: FormData) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const username = String(formData.get("username") ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return { error: "3–20 chars: letters, numbers, underscore" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", userId);

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
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const raw = String(formData.get("hot_take") ?? "").trim();
  const value = raw ? raw.slice(0, HOT_TAKE_MAX) : null;

  const { error } = await supabase
    .from("profiles")
    .update({ hot_take: value })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { ok: true as const };
}

// Set the profile photo. The file itself is uploaded to storage client-side
// (RLS scopes it to the user's own folder); this records the resulting public
// URL on the profile. We only accept URLs that point at this user's own object
// in our avatars bucket, so a caller can't set an arbitrary remote image.
export async function updateAvatarUrl(url: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Storage not configured" };
  const expectedPrefix = `${base}/storage/v1/object/public/avatars/${userId}/`;
  // Strip the cache-busting query before checking the path.
  const withoutQuery = url.split("?")[0];
  if (!withoutQuery.startsWith(expectedPrefix)) {
    return { error: "Invalid avatar URL" };
  }

  // TODO(moderation): before accepting, run the uploaded image through an
  // image-moderation check (e.g. OpenAI omni-moderation) and reject NSFW here.

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// Clear the uploaded photo (reverting to the preset/default) and best-effort
// delete the stored file.
export async function removeAvatar() {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const supabase = await createClient();
  await supabase.storage.from("avatars").remove([AVATAR_OBJECT(userId)]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addFavorite(tmdbId: number) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  // Append to the end of the list.
  const { count } = await supabase
    .from("favorite_movies")
    .select("tmdb_id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { error } = await supabase.from("favorite_movies").insert({
    user_id: userId,
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
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const { error } = await supabase
    .from("favorite_movies")
    .delete()
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath(`/movie/${tmdbId}`);
  return { ok: true as const };
}
