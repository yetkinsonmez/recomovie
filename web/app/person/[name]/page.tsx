import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/MovieCard";
import type { CastMember, Movie } from "@/lib/types";

export const dynamic = "force-dynamic";

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const SELECT =
  "tmdb_id, title, poster_url, release_date, vote_average, genres_text, top_cast";

// A film row plus its full cast, so we can both render a card and dig out the
// matched person's photo/character (top_cast has no person id — we match by
// exact name).
type FilmRow = Movie & { top_cast: CastMember[] | null };

interface Credits {
  directed: FilmRow[];
  acted: FilmRow[];
}

// A person can be both a director and an actor (e.g. Tarantino), so we run two
// lookups in parallel:
//   • directed → exact match on the `director` column (btree index)
//   • acted    → JSONB containment on `top_cast` (GIN index)
//
// NOTE on `.contains()`: the value MUST be a JSON *string*. Handed a raw array,
// supabase-js serializes a Postgres array literal (`{...}`) instead of JSON,
// which Postgres rejects with 22P02 ("invalid input syntax for type json").
async function getCredits(name: string): Promise<Credits> {
  const [directedRes, actedRes] = await Promise.all([
    supabase
      .from("movies")
      .select(SELECT)
      .eq("director", name)
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(120),
    supabase
      .from("movies")
      .select(SELECT)
      .contains("top_cast", JSON.stringify([{ name }]))
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(120),
  ]);

  if (directedRes.error) throw directedRes.error;
  if (actedRes.error) throw actedRes.error;

  return {
    directed: (directedRes.data ?? []) as FilmRow[],
    acted: (actedRes.data ?? []) as FilmRow[],
  };
}

// The person's profile photo only exists in cast credits (the director column
// is a bare name with no photo). Scan acting credits for the first match.
function personPhoto(name: string, acted: FilmRow[]): string | null {
  for (const film of acted) {
    const member = film.top_cast?.find((c) => c.name === name);
    if (member?.profile_path) return member.profile_path;
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return {
    title: `${decoded} — filmography — recomovie`,
    description: `Every film directed by or featuring ${decoded} in the recomovie catalog.`,
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const { directed, acted } = await getCredits(decoded);
  if (directed.length === 0 && acted.length === 0) notFound();

  const profilePath = personPhoto(decoded, acted);

  // Distinct films across both roles, for the header count.
  const totalFilms = new Set([
    ...directed.map((f) => f.tmdb_id),
    ...acted.map((f) => f.tmdb_id),
  ]).size;

  // Build the credit role line: "Director · Actor", whichever apply.
  const roles = [
    directed.length > 0 ? "Director" : null,
    acted.length > 0 ? "Actor" : null,
  ].filter(Boolean);

  return (
    <main className="profile-stage">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="profile-inner">
        <section className="profile-header">
          <div className="public-avatar person-photo">
            {profilePath ? (
              <Image
                src={`${TMDB_PROFILE_BASE}${profilePath}`}
                alt={decoded}
                width={120}
                height={120}
                className="avatar-img"
              />
            ) : (
              <div className="person-photo-empty" aria-hidden="true">
                {decoded.charAt(0)}
              </div>
            )}
          </div>
          <div className="profile-meta">
            <h1 className="username-display">{decoded}</h1>
            {roles.length > 0 && (
              <p className="meta">{roles.join("  ·  ")}</p>
            )}
            <p className="meta">
              {totalFilms} {totalFilms === 1 ? "film" : "films"} in the catalog
            </p>
          </div>
        </section>

        {directed.length > 0 && (
          <section className="profile-section">
            <h2 className="profile-section-title">
              <span className="landing-grad">Directed</span>
            </h2>
            <section className="grid catalog-grid">
              {directed.map((film) => (
                <MovieCard key={film.tmdb_id} movie={film} />
              ))}
            </section>
          </section>
        )}

        {acted.length > 0 && (
          <section className="profile-section">
            <h2 className="profile-section-title">
              <span className="landing-grad">
                {directed.length > 0 ? "Appears in" : "Filmography"}
              </span>
            </h2>
            <section className="grid catalog-grid">
              {acted.map((film) => (
                <MovieCard key={film.tmdb_id} movie={film} />
              ))}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
