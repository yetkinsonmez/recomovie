import Image from "next/image";
import { VTLink } from "./VTLink";

export interface DiaryEntry {
  tmdb_id: number;
  rating: number;
  updated_at: string;
  comment: string | null;
  movie: {
    title: string;
    poster_url: string | null;
    release_date: string | null;
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MiniStars({ value }: { value: number }) {
  // Renders the rating as a compact star strip — same visual language as the
  // big widget on the movie page, but read-only.
  return (
    <span className="diary-stars" aria-label={`${value.toFixed(1)} out of 10`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
        const fill = value >= i ? "full" : value >= i - 0.5 ? "half" : "empty";
        const width = fill === "full" ? "100%" : fill === "half" ? "50%" : "0%";
        return (
          <span key={i} className="diary-star">
            <svg viewBox="0 0 24 24" className="star-empty">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                d="M12 3l2.7 5.9 6.3.6-4.7 4.3 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.5l6.3-.6L12 3z"
              />
            </svg>
            <span className="star-fill-clip" style={{ width }}>
              <svg viewBox="0 0 24 24" className="star-full">
                <path
                  fill="currentColor"
                  d="M12 3l2.7 5.9 6.3.6-4.7 4.3 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.5l6.3-.6L12 3z"
                />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingsDiary({
  entries,
  subject = "you",
}: {
  entries: DiaryEntry[];
  /** "you" → "You rated this 9.5". Anything else → "@name rated this 9.5". */
  subject?: "you" | string;
}) {
  const isOwn = subject === "you";

  if (entries.length === 0) {
    return (
      <p className="meta">
        {isOwn
          ? "No ratings yet — rate a film on its page to see it here."
          : `@${subject} hasn't rated anything yet.`}
      </p>
    );
  }

  return (
    <ul className="diary-list">
      {entries.map((e) => (
        <li key={e.tmdb_id} className="diary-row">
          <VTLink
            href={`/movie/${e.tmdb_id}`}
            className="diary-poster"
            style={{ viewTransitionName: `poster-${e.tmdb_id}` } as React.CSSProperties}
          >
            {e.movie.poster_url ? (
              <Image
                src={e.movie.poster_url}
                alt=""
                fill
                sizes="48px"
              />
            ) : (
              <span className="diary-poster-empty" />
            )}
          </VTLink>
          <div className="diary-body">
            <VTLink href={`/movie/${e.tmdb_id}`} className="diary-title">
              {e.movie.title}
              {e.movie.release_date && (
                <span className="meta">
                  {" "}({e.movie.release_date.slice(0, 4)})
                </span>
              )}
            </VTLink>
            <MiniStars value={e.rating} />
            <p className="meta diary-date">
              {isOwn ? "You rated this" : `@${subject} rated this`}{" "}
              <strong>{e.rating.toFixed(1)} / 10</strong> on{" "}
              {formatDate(e.updated_at)}
            </p>
            {e.comment && (
              <p className="diary-comment">{e.comment}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
