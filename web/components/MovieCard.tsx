import Image from "next/image";
import { VTLink } from "./VTLink";
import type { Movie, Recommendation } from "@/lib/types";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7L12 17.3 5.8 20.8l1.6-6.7L2.2 9.5l6.9-.6z" />
    </svg>
  );
}

export function MovieCard({
  movie,
  isRated = false,
}: {
  movie: Movie | Recommendation;
  isRated?: boolean;
}) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const similarity =
    "similarity" in movie ? Math.round(movie.similarity * 100) : null;
  // Colour the match badge on a continuous red→orange→green sweep. Anchored so
  // 60% lands on orange (hue 30) and 80% on full green (hue 140); below 60
  // slides toward red, ≥80 stays ultra green.
  const matchHue =
    similarity === null
      ? null
      : Math.max(0, Math.min(140, 30 + (similarity - 60) * 5.5));
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const vtName = `poster-${movie.tmdb_id}`;

  return (
    <VTLink
      href={`/movie/${movie.tmdb_id}`}
      className={`card ${isRated ? "is-rated" : ""}`}
      title={isRated ? "You've already rated this" : undefined}
    >
      <div
        className="poster"
        style={{ viewTransitionName: vtName } as React.CSSProperties}
      >
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            className="poster-img"
          />
        ) : (
          <div className="poster-empty">No image</div>
        )}
        {similarity !== null && (
          <span
            className="badge"
            style={
              {
                backgroundColor: `hsl(${matchHue} 68% 40%)`,
                color: "#fff",
              } as React.CSSProperties
            }
          >
            {similarity}% match
          </span>
        )}
        {rating && (
          <span className="rating-chip">
            <StarIcon />
            {rating}
          </span>
        )}
      </div>
      <div className="card-body">
        <h3>{movie.title}</h3>
        {year && <p className="meta">{year}</p>}
      </div>
    </VTLink>
  );
}
