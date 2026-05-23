import Link from "next/link";
import type { Movie, Recommendation } from "@/lib/types";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7L12 17.3 5.8 20.8l1.6-6.7L2.2 9.5l6.9-.6z" />
    </svg>
  );
}

export function MovieCard({ movie }: { movie: Movie | Recommendation }) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const similarity =
    "similarity" in movie ? Math.round(movie.similarity * 100) : null;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

  return (
    <Link href={`/movie/${movie.tmdb_id}`} className="card">
      <div className="poster">
        {movie.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.poster_url} alt={movie.title} loading="lazy" />
        ) : (
          <div className="poster-empty">No image</div>
        )}
        {similarity !== null && (
          <span className="badge">{similarity}% match</span>
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
    </Link>
  );
}
