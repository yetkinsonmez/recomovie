"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rateMovie, removeRating } from "@/app/movie/actions";
import { Spinner } from "./Spinner";

function StarShape({ fill }: { fill: "empty" | "half" | "full" }) {
  // Two stacked stars — empty silhouette behind, gold "fill" on top, clipped
  // to 0% / 50% / 100% width.
  const width = fill === "full" ? "100%" : fill === "half" ? "50%" : "0%";
  return (
    <span className="star-shape" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="star-empty">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
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
}

export function RatingWidget({
  tmdbId,
  initialRating,
  isSignedIn,
}: {
  tmdbId: number;
  initialRating: number | null;
  isSignedIn: boolean;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const shown = hover ?? rating ?? 0;

  function fillFor(starIndex: number): "empty" | "half" | "full" {
    if (shown >= starIndex) return "full";
    if (shown >= starIndex - 0.5) return "half";
    return "empty";
  }

  function setTo(value: number) {
    if (!isSignedIn) {
      router.push("/login?message=Sign in to rate movies");
      return;
    }
    const prev = rating;
    setRating(value);
    setError(null);
    startTransition(async () => {
      const res = await rateMovie(tmdbId, value);
      if (res && "error" in res) {
        setRating(prev);
        setError(res.error ?? "Rating update failed");
      }
    });
  }

  function clear() {
    if (rating === null) return;
    const prev = rating;
    setRating(null);
    setError(null);
    startTransition(async () => {
      const res = await removeRating(tmdbId);
      if (res && "error" in res) {
        setRating(prev);
        setError(res.error ?? "Rating update failed");
      }
    });
  }

  return (
    <div className="rating-widget">
      <div className="rating-row">
        <div
          className={`rating-stars ${pending ? "is-pending" : ""}`}
          onMouseLeave={() => setHover(null)}
          role="radiogroup"
          aria-label="Your rating, out of 10"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <span key={i} className="star-wrap">
              <StarShape fill={fillFor(i)} />
              <button
                type="button"
                className="star-hit star-hit-half"
                onMouseEnter={() => setHover(i - 0.5)}
                onClick={() => setTo(i - 0.5)}
                aria-label={`Rate ${i - 0.5} out of 10`}
                disabled={pending}
              />
              <button
                type="button"
                className="star-hit star-hit-full"
                onMouseEnter={() => setHover(i)}
                onClick={() => setTo(i)}
                aria-label={`Rate ${i} out of 10`}
                disabled={pending}
              />
            </span>
          ))}
        </div>

        <div className="rating-readout">
          {pending ? (
            <Spinner size={16} />
          ) : shown ? (
            <strong>{shown.toFixed(1)}</strong>
          ) : (
            <span className="meta">– / 10</span>
          )}
          {rating !== null && !pending && (
            <button
              type="button"
              className="link-button"
              onClick={clear}
              aria-label="Remove your rating"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {!isSignedIn && (
        <p className="meta rating-hint">Sign in to rate this film.</p>
      )}
      {rating !== null && !pending && (
        <p className="meta rating-hint">
          You rated this <strong>{rating.toFixed(1)} / 10</strong>.
        </p>
      )}
      {error && <p className="auth-error rating-hint">{error}</p>}
    </div>
  );
}
