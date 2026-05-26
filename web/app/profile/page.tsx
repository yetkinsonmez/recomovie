import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarPicker } from "@/components/AvatarPicker";
import { UsernameForm } from "@/components/UsernameForm";
import { FavoriteMovies } from "@/components/FavoriteMovies";
import { RatingsDiary, type DiaryEntry } from "@/components/RatingsDiary";
import type { Movie } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Sign in to see your profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_id")
    .eq("id", user.id)
    .single();

  const { data: favRows } = await supabase
    .from("favorite_movies")
    .select(
      `position, tmdb_id, movies:tmdb_id (
        tmdb_id, title, poster_url, release_date, vote_average, genres_text
      )`,
    )
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const favorites: Movie[] = (favRows ?? [])
    .map((r) => (Array.isArray(r.movies) ? r.movies[0] : r.movies))
    .filter((m): m is Movie => !!m);

  const { data: ratingRows } = await supabase
    .from("user_movie_ratings")
    .select(
      `tmdb_id, rating, comment, updated_at, movies:tmdb_id (
        title, poster_url, release_date
      )`,
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const diary: DiaryEntry[] = (ratingRows ?? [])
    .map((r) => {
      const movie = Array.isArray(r.movies) ? r.movies[0] : r.movies;
      if (!movie) return null;
      return {
        tmdb_id: r.tmdb_id as number,
        rating: Number(r.rating),
        updated_at: r.updated_at as string,
        comment: (r.comment as string | null) ?? null,
        movie,
      } satisfies DiaryEntry;
    })
    .filter((e): e is DiaryEntry => !!e);

  return (
    <main className="profile-stage">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="profile-inner">
        <section className="profile-header">
          <AvatarPicker currentAvatarId={profile?.avatar_id ?? null} />
          <div className="profile-meta">
            <UsernameForm current={profile?.username ?? null} />
            <p className="meta">{user.email}</p>
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Four favorites</span>
          </h2>
          <p className="profile-section-sub">
            Pick the four films you'd save from a desert island.
          </p>
          <FavoriteMovies initial={favorites} />
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Diary</span>
          </h2>
          <p className="profile-section-sub">
            Every film you've rated, newest first.
          </p>
          <RatingsDiary entries={diary} />
        </section>
      </div>
    </main>
  );
}
