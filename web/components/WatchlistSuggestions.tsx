"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Recommendation } from "@/lib/types";
import { addToWatchlist } from "@/app/watchlist/actions";
import { Spinner } from "./Spinner";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WatchlistSuggestions({
  suggestions,
  ratedIds,
}: {
  suggestions: Recommendation[];
  ratedIds: number[];
}) {
  const ratedSet = new Set(ratedIds);
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  function handleAdd(tmdbId: number) {
    setPendingId(tmdbId);
    startTransition(async () => {
      const res = await addToWatchlist(tmdbId);
      setPendingId(null);
      if (res && "ok" in res) {
        setAddedIds((prev) => new Set(prev).add(tmdbId));
        // Re-fetch server data so the suggestion list and the watchlist grid
        // both refresh — adding a new movie shifts the centroid.
        router.refresh();
      }
    });
  }

  if (suggestions.length === 0) {
    return (
      <p className="meta">
        Add a few films to your watchlist and we'll start suggesting more like
        them.
      </p>
    );
  }

  return (
    <div className="wl-suggest-strip" role="list">
      {suggestions.map((m) => {
        const isPending = pendingId === m.tmdb_id;
        const isAdded = addedIds.has(m.tmdb_id);
        const rated = ratedSet.has(m.tmdb_id);
        return (
          <article
            key={m.tmdb_id}
            className={`wl-suggest-card ${rated ? "is-rated" : ""}`}
            role="listitem"
            title={rated ? "You've already rated this" : undefined}
          >
            <div className="wl-suggest-poster-wrap">
              <Link href={`/movie/${m.tmdb_id}`} className="wl-suggest-poster">
                {m.poster_url ? (
                  <Image src={m.poster_url} alt={m.title} fill sizes="200px" />
                ) : (
                  <div className="poster-empty">No image</div>
                )}
                {m.vote_average ? (
                  <span className="rating-chip">
                    ★ {m.vote_average.toFixed(1)}
                  </span>
                ) : null}
              </Link>
              {/* Sibling of the poster Link (not nested — a button inside an
                  anchor is invalid), centred over it via absolute positioning. */}
              <button
                type="button"
                className={`wl-suggest-fab ${isAdded ? "is-added" : ""}`}
                onClick={() => handleAdd(m.tmdb_id)}
                disabled={isPending || isAdded}
                aria-label={
                  isAdded
                    ? `${m.title} added to watchlist`
                    : `Add ${m.title} to watchlist`
                }
                title={isAdded ? "Added to watchlist" : "Add to watchlist"}
              >
                {isPending ? (
                  <Spinner size={20} />
                ) : isAdded ? (
                  <CheckIcon />
                ) : (
                  <PlusIcon />
                )}
              </button>
            </div>
            <div className="wl-suggest-body">
              <Link href={`/movie/${m.tmdb_id}`} className="wl-suggest-title">
                {m.title}
              </Link>
              {m.release_date && (
                <span className="meta">{m.release_date.slice(0, 4)}</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
