import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/MovieCard";
import { CastStrip } from "@/components/CastStrip";
import { WatchProviders } from "@/components/WatchProviders";
import { HeroTrailer } from "@/components/HeroTrailer";
import type {
  MovieDetail,
  Recommendation,
  RegionProviders,
} from "@/lib/types";

function pickRegion(
  providers: Record<string, RegionProviders> | null,
): { region: string; data: RegionProviders } | null {
  if (!providers) return null;
  for (const code of ["TR", "US"]) {
    const data = providers[code];
    if (data) return { region: code, data };
  }
  const entries = Object.entries(providers);
  return entries.length ? { region: entries[0][0], data: entries[0][1] } : null;
}

function splitGenres(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();

  const { data: movie, error } = await supabase
    .from("movies")
    .select(
      "tmdb_id,title,overview,genres_text,poster_url,backdrop_url,release_date,runtime,vote_average,tagline,director,top_cast,trailer_youtube_key,streaming_providers,mpaa_rating",
    )
    .eq("tmdb_id", tmdbId)
    .single();

  if (error || !movie) notFound();

  const film = movie as MovieDetail;
  const year = film.release_date ? film.release_date.slice(0, 4) : "";
  const backdrop = film.backdrop_url
    ? film.backdrop_url.replace(/\/w\d+\//, "/original/")
    : null;

  const eyebrowParts = [
    year,
    film.runtime ? `${film.runtime} min` : null,
    film.mpaa_rating || null,
  ].filter(Boolean) as string[];
  const eyebrow = eyebrowParts.join("  ·  ");

  const genres = splitGenres(film.genres_text);
  const region = pickRegion(film.streaming_providers ?? null);

  const { data: recs } = await supabase.rpc("match_movies", {
    p_tmdb_id: tmdbId,
    p_count: 10,
  });
  const recommendations = (recs ?? []) as Recommendation[];

  return (
    <main>
      <section className={backdrop ? "movie-hero has-backdrop" : "movie-hero"}>
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="movie-hero-bg" src={backdrop} alt="" />
        )}
        {film.trailer_youtube_key && (
          <HeroTrailer videoKey={film.trailer_youtube_key} title={film.title} />
        )}
        <div className="movie-hero-scrim" />
        <div className="movie-hero-inner">
          <Link href="/" className="back">
            ← All movies
          </Link>

          <div className="movie-hero-body">
            <div className="detail-poster">
              {film.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={film.poster_url} alt={film.title} />
              ) : (
                <div className="poster-empty">No image</div>
              )}
            </div>

            <div className="detail-info">
              {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
              <h1 className="hero-title">{film.title}</h1>
              {film.tagline && (
                <p className="hero-tagline">“{film.tagline}”</p>
              )}
              <div className="hero-meta-row">
                {film.director && (
                  <span className="hero-director">
                    <span className="muted-prefix">Directed by</span>{" "}
                    {film.director}
                  </span>
                )}
                {film.vote_average ? (
                  <span className="rating-pill">
                    ★ {film.vote_average.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {genres.length > 0 && (
                <div className="genre-pills">
                  {genres.map((genre) => (
                    <span key={genre} className="genre-pill">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {film.overview && <p className="overview">{film.overview}</p>}

        {region && (
          <section className="detail-section">
            <h2>Where to watch</h2>
            <WatchProviders
              providers={region.data}
              region={region.region}
              title={film.title}
              releaseYear={year}
            />
          </section>
        )}

        {film.top_cast && film.top_cast.length > 0 && (
          <section className="detail-section">
            <h2>Cast</h2>
            <CastStrip cast={film.top_cast} />
          </section>
        )}

        <section className="detail-section">
          <h2>Movies with a similar story</h2>
          {recommendations.length === 0 ? (
            <p className="error">No recommendations available.</p>
          ) : (
            <section className="grid">
              {recommendations.map((rec) => (
                <MovieCard key={rec.tmdb_id} movie={rec} />
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
