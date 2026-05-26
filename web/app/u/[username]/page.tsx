import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { avatarSrc } from "@/lib/avatars";
import { RatingsDiary, type DiaryEntry } from "@/components/RatingsDiary";
import { SignInGate } from "@/components/SignInGate";
import type { Movie } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — recomovie`,
    description: `${username}'s favorite films, watchlist and rating diary on recomovie.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Profile lookup — citext makes the eq case-insensitive.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_id, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!viewer;

  // Only fetch the gated content if the viewer is signed in — saves three
  // round-trips and avoids leaking data via response timings.
  type FavMovie = Movie;
  type WlMovie = Movie;
  let favorites: FavMovie[] = [];
  let watchlist: WlMovie[] = [];
  let diary: DiaryEntry[] = [];

  if (isLoggedIn) {
    const [favsRes, wlRes, diaryRes] = await Promise.all([
      supabase
        .from("favorite_movies")
        .select(
          `position, movies:tmdb_id (
            tmdb_id, title, poster_url, release_date, vote_average, genres_text
          )`,
        )
        .eq("user_id", profile.id)
        .order("position", { ascending: true }),
      supabase
        .from("watchlist")
        .select(
          `added_at, movies:tmdb_id (
            tmdb_id, title, poster_url, release_date, vote_average, genres_text
          )`,
        )
        .eq("user_id", profile.id)
        .order("added_at", { ascending: false })
        .limit(24),
      supabase
        .from("user_movie_ratings")
        .select(
          `tmdb_id, rating, comment, updated_at, movies:tmdb_id (
            title, poster_url, release_date
          )`,
        )
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(30),
    ]);

    const pickMovie = <T,>(row: { movies: T | T[] | null }): T | null => {
      if (!row.movies) return null;
      return Array.isArray(row.movies) ? row.movies[0] : row.movies;
    };

    favorites = (favsRes.data ?? [])
      .map((r) => pickMovie<Movie>(r))
      .filter((m): m is Movie => !!m);

    watchlist = (wlRes.data ?? [])
      .map((r) => pickMovie<Movie>(r))
      .filter((m): m is Movie => !!m);

    diary = (diaryRes.data ?? [])
      .map((r) => {
        const m = pickMovie<{
          title: string;
          poster_url: string | null;
          release_date: string | null;
        }>(r);
        if (!m) return null;
        return {
          tmdb_id: r.tmdb_id as number,
          rating: Number(r.rating),
          updated_at: r.updated_at as string,
          comment: (r.comment as string | null) ?? null,
          movie: m,
        } satisfies DiaryEntry;
      })
      .filter((e): e is DiaryEntry => !!e);
  }

  const joined = new Date(profile.created_at as string).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  // Pad favorites to 4 slots so the layout matches the owner's view.
  const favSlots: (Movie | null)[] = Array.from(
    { length: 4 },
    (_, i) => favorites[i] ?? null,
  );

  const nextPath = `/u/${profile.username}`;

  return (
    <main className="profile-stage">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="profile-inner">
        <section className="profile-header">
          <div className="public-avatar">
            <Image
              src={avatarSrc(profile.avatar_id)}
              alt=""
              width={120}
              height={120}
              className="avatar-img"
            />
          </div>
          <div className="profile-meta">
            <h1 className="username-display">@{profile.username}</h1>
            <p className="meta">Joined {joined}</p>
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Four favorites</span>
          </h2>
          {!isLoggedIn ? (
            <SignInGate
              label={`See @${profile.username}'s favorites`}
              nextPath={nextPath}
            />
          ) : favorites.length === 0 ? (
            <p className="meta">No favorites picked yet.</p>
          ) : (
            <div className="fav-slots">
              {favSlots.map((m, idx) =>
                m ? (
                  <Link
                    key={`${m.tmdb_id}`}
                    href={`/movie/${m.tmdb_id}`}
                    className="fav-slot fav-slot-filled"
                  >
                    <span className="fav-slot-poster">
                      {m.poster_url ? (
                        <Image
                          src={m.poster_url}
                          alt={m.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 220px"
                        />
                      ) : (
                        <div className="poster-empty">No image</div>
                      )}
                    </span>
                    <div className="fav-slot-foot">
                      <span className="fav-slot-title" title={m.title}>
                        {m.title}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={`empty-${idx}`}
                    className="fav-slot fav-slot-empty"
                    aria-hidden="true"
                  >
                    <span className="fav-slot-hint">—</span>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Watchlist</span>
          </h2>
          {!isLoggedIn ? (
            <SignInGate
              label={`See @${profile.username}'s watchlist`}
              nextPath={nextPath}
            />
          ) : watchlist.length === 0 ? (
            <p className="meta">Watchlist is empty.</p>
          ) : (
            <section className="grid catalog-grid">
              {watchlist.map((m) => (
                <Link
                  key={m.tmdb_id}
                  href={`/movie/${m.tmdb_id}`}
                  className="card"
                >
                  <div className="poster">
                    {m.poster_url ? (
                      <Image
                        src={m.poster_url}
                        alt={m.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                      />
                    ) : (
                      <div className="poster-empty">No image</div>
                    )}
                    {m.vote_average ? (
                      <span className="rating-chip">
                        ★ {m.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <div className="card-body">
                    <h3>{m.title}</h3>
                    {m.release_date && (
                      <p className="meta">{m.release_date.slice(0, 4)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </section>
          )}
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="landing-grad">Diary</span>
          </h2>
          {!isLoggedIn ? (
            <SignInGate
              label={`See @${profile.username}'s diary`}
              nextPath={nextPath}
            />
          ) : (
            <RatingsDiary entries={diary} subject={profile.username as string} />
          )}
        </section>
      </div>
    </main>
  );
}
