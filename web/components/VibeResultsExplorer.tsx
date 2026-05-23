"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { MovieCard } from "@/components/MovieCard";
import type { Recommendation } from "@/lib/types";

const PAGE_SIZE = 24;

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7L12 17.3 5.8 20.8l1.6-6.7L2.2 9.5l6.9-.6z" />
    </svg>
  );
}

function MatchBackground({ mood }: { mood: string }) {
  const words = mood
    .split(/\s+/)
    .map((word) => word.replace(/[^\w-]/g, ""))
    .filter((word) => word.length > 2)
    .slice(0, 7);
  const labels = words.length ? words : ["story", "mood", "visual", "pace"];

  return (
    <div className="match-bg" aria-hidden="true">
      {labels.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className="match-bg-token"
          style={
            {
              "--i": index,
              "--x": `${2 + index * 13}%`,
              "--y": `${(index % 3) * 54}px`,
            } as CSSProperties
          }
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function VibeResultsExplorer({
  mood,
  results,
}: {
  mood: string;
  results: Recommendation[];
}) {
  const [minRating, setMinRating] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () =>
      results.filter((movie) => {
        const rating = movie.vote_average ?? 0;
        return rating >= minRating;
      }),
    [minRating, results],
  );

  const visible = filtered.slice(0, visibleCount);
  const canShowMore = visibleCount < filtered.length;

  function updateRating(value: number) {
    setMinRating(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="vibe-results-shell">
      <span className="vibe-results-orb vibe-results-orb-1" aria-hidden="true" />
      <span className="vibe-results-orb vibe-results-orb-2" aria-hidden="true" />
      <MatchBackground mood={mood} />

      <div className="vibe-results-head">
        <div>
          <p className="result-kicker">Matched to your vibe</p>
          <h1 className="result-title">“{mood}”</h1>
        </div>

        <label
          className="rating-filter"
          style={{ "--rating-progress": `${minRating * 10}%` } as CSSProperties}
        >
          <span className="rating-filter-top">
            <span>Minimum rating</span>
            <strong>
              <StarIcon />
              {minRating.toFixed(1)}
            </strong>
          </span>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={minRating}
            onChange={(event) => updateRating(Number(event.target.value))}
            aria-label="Minimum movie rating"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">
          No matches at that rating. Lower the rating filter to broaden the list.
        </p>
      ) : (
        <>
          <section className="grid vibe-results-grid">
            {visible.map((movie, index) => (
              <div
                key={movie.tmdb_id}
                className="vibe-result-card"
                style={
                  { "--d": `${Math.min(index, 23) * 28}ms` } as CSSProperties
                }
              >
                <MovieCard movie={movie} />
              </div>
            ))}
          </section>

          {canShowMore && (
            <div className="load-more-row">
              <button
                type="button"
                className="load-more-btn"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Show more matches
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
