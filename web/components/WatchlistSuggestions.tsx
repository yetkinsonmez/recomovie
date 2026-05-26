"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Recommendation } from "@/lib/types";
import { addToWatchlist } from "@/app/watchlist/actions";
import { Spinner } from "./Spinner";

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
            <Link href={`/movie/${m.tmdb_id}`} className="wl-suggest-poster">
              {m.poster_url ? (
                <Image
                  src={m.poster_url}
                  alt={m.title}
                  fill
                  sizes="200px"
                />
              ) : (
                <div className="poster-empty">No image</div>
              )}
              {m.vote_average ? (
                <span className="rating-chip">
                  ★ {m.vote_average.toFixed(1)}
                </span>
              ) : null}
            </Link>
            <div className="wl-suggest-body">
              <Link href={`/movie/${m.tmdb_id}`} className="wl-suggest-title">
                {m.title}
              </Link>
              {m.release_date && (
                <span className="meta">{m.release_date.slice(0, 4)}</span>
              )}
              <button
                type="button"
                className={`wl-suggest-add ${isAdded ? "is-added" : ""}`}
                onClick={() => handleAdd(m.tmdb_id)}
                disabled={isPending || isAdded}
              >
                {isPending ? (
                  <>
                    <Spinner size={12} /> Adding…
                  </>
                ) : isAdded ? (
                  "✓ Added"
                ) : (
                  "+ Add"
                )}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
