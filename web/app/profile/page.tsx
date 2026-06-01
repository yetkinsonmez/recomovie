import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/AvatarUploader";
import { FavoriteMovies } from "@/components/FavoriteMovies";
import { ProfileSettings } from "@/components/ProfileSettings";
import { RatingsDiary, type DiaryEntry } from "@/components/RatingsDiary";
import { CriticProfile } from "@/components/CriticProfile";
import { Badges } from "@/components/Badges";
import { UsernameForm } from "@/components/UsernameForm";
import { getProfileStats } from "@/lib/profileStats";
import { getCurrentUser } from "@/lib/auth";
import type { Movie } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login?message=Sign in to see your profile");

  // These three reads are independent — fire them together instead of in
  // series. The heavier stats aggregation is streamed separately (below).
  const [{ data: profile }, { data: favRows }, { data: ratingRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, avatar_url, hot_take")
        .eq("id", user.id)
        .single(),
      supabase
        .from("favorite_movies")
        .select(
          `position, tmdb_id, movies:tmdb_id (
            tmdb_id, title, poster_url, release_date, vote_average, genres_text
          )`,
        )
        .eq("user_id", user.id)
        .order("position", { ascending: true }),
      supabase
        .from("user_movie_ratings")
        .select(
          `tmdb_id, rating, comment, comment_spoiler, updated_at, movies:tmdb_id (
            title, poster_url, release_date
          )`,
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

  const favorites: Movie[] = (favRows ?? [])
    .map((r) => (Array.isArray(r.movies) ? r.movies[0] : r.movies))
    .filter((m): m is Movie => !!m);

  const diary: DiaryEntry[] = (ratingRows ?? [])
    .map((r) => {
      const movie = Array.isArray(r.movies) ? r.movies[0] : r.movies;
      if (!movie) return null;
      return {
        tmdb_id: r.tmdb_id as number,
        rating: Number(r.rating),
        updated_at: r.updated_at as string,
        comment: (r.comment as string | null) ?? null,
        is_spoiler: !!r.comment_spoiler,
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
          <AvatarUploader
            userId={user.id}
            avatarUrl={profile?.avatar_url ?? null}
          />
          <div className="profile-meta">
            <h1 className="username-display">
              {profile?.username ? `@${profile.username}` : "Set your username"}
            </h1>
            <p className="meta">{user.email}</p>
            {profile?.hot_take && (
              <blockquote className="hot-take-quote">
                {profile.hot_take}
              </blockquote>
            )}
          </div>
          <ProfileSettings
            username={profile?.username ?? null}
            hotTake={profile?.hot_take ?? null}
          />
        </section>

        {!profile?.username && (
          <section className="username-setup">
            <h2 className="username-setup-title">
              Pick a <span className="landing-grad">username</span>
            </h2>
            <p className="meta">
              Choose a handle so your ratings and reviews show up across the
              site. You can change it later in Settings.
            </p>
            <UsernameForm current={null} />
          </section>
        )}

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
            <span className="landing-grad">Critic personality</span>
          </h2>
          <p className="profile-section-sub">
            How your ratings compare to the crowd, genre by genre.
          </p>
          <Suspense
            fallback={
              <div className="sk" style={{ height: 220, borderRadius: 14 }} />
            }
          >
            <CriticData userId={user.id} />
          </Suspense>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Badges</span>
          </h2>
          <p className="profile-section-sub">
            Milestones you've unlocked across volume, taste and social.
          </p>
          <Suspense
            fallback={
              <div className="sk" style={{ height: 120, borderRadius: 14 }} />
            }
          >
            <BadgesData userId={user.id} />
          </Suspense>
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

// Both stats sections derive from one ~2000-row aggregation. cache() dedupes it
// per request, so the two streamed components below share a single query while
// each renders behind its own Suspense boundary.
const loadStats = cache(async (userId: string) => {
  const supabase = await createClient();
  return getProfileStats(supabase, userId);
});

async function CriticData({ userId }: { userId: string }) {
  const { critic } = await loadStats(userId);
  return <CriticProfile stats={critic} />;
}

async function BadgesData({ userId }: { userId: string }) {
  const { badges } = await loadStats(userId);
  return <Badges badges={badges} />;
}
