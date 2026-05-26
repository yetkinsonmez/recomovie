"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { VTLink } from "./VTLink";
import type { Movie } from "@/lib/types";
import { removeFromWatchlist } from "@/app/watchlist/actions";
import { Spinner } from "./Spinner";

export interface WatchlistEntry extends Movie {
  added_at: string;
}

const SORTS = [
  { value: "added", label: "Recently added" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest released" },
  { value: "title", label: "A–Z" },
] as const;

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Family",
  "Fantasy", "History", "Horror", "Music", "Mystery", "Romance",
  "Science Fiction", "Thriller", "War", "Western",
];

function ChevronIcon() {
  return (
    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function WatchlistGrid({
  initial,
  ratedIds,
}: {
  initial: WatchlistEntry[];
  ratedIds: number[];
}) {
  const ratedSet = useMemo(() => new Set(ratedIds), [ratedIds]);

  const [items, setItems] = useState<WatchlistEntry[]>(initial);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // The server passes a new `initial` array on every `router.refresh()` (e.g.
  // after the user adds a movie from the suggestions strip). Sync that into
  // local state so newly-added entries appear immediately, but keep the local
  // state writable so optimistic removes still work between refreshes.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("added");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = items.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q)) return false;
      if (genre && !(m.genres_text ?? "").toLowerCase().includes(genre.toLowerCase())) {
        return false;
      }
      return true;
    });
    out = [...out];
    switch (sort) {
      case "added":
        out.sort((a, b) => b.added_at.localeCompare(a.added_at));
        break;
      case "rating":
        out.sort(
          (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0),
        );
        break;
      case "newest":
        out.sort((a, b) =>
          (b.release_date ?? "").localeCompare(a.release_date ?? ""),
        );
        break;
      case "title":
        out.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return out;
  }, [items, query, genre, sort]);

  function handleRemove(tmdbId: number) {
    const snapshot = items;
    setRemovingId(tmdbId);
    setItems((prev) => prev.filter((m) => m.tmdb_id !== tmdbId));
    startTransition(async () => {
      const res = await removeFromWatchlist(tmdbId);
      setRemovingId(null);
      if (res && "error" in res) setItems(snapshot);
    });
  }

  if (items.length === 0) {
    return (
      <p className="empty">
        Your watchlist is empty. Open any movie and tap{" "}
        <strong>+ Watchlist</strong> to start building it.
      </p>
    );
  }

  return (
    <>
      <div className="controls">
        <div className="search-wrap">
          <span className="control-label">Title</span>
          <SearchIcon />
          <input
            className="search"
            type="search"
            placeholder="Filter your watchlist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="select-wrap">
          <span className="control-label">Genre</span>
          <select
            className="select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <ChevronIcon />
        </label>
        <label className="select-wrap">
          <span className="control-label">Sort by</span>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronIcon />
        </label>
      </div>

      <p className="result-count" style={{ marginTop: "1rem" }}>
        Showing {filtered.length} of {items.length}
      </p>

      {filtered.length === 0 ? (
        <p className="empty">No movies match those filters.</p>
      ) : (
        <section className="grid catalog-grid">
          {filtered.map((m) => {
            const isRemoving = removingId === m.tmdb_id;
            const rated = ratedSet.has(m.tmdb_id);
            return (
              <div key={m.tmdb_id} className="wl-card">
                <VTLink
                  href={`/movie/${m.tmdb_id}`}
                  className={`card ${rated ? "is-rated" : ""}`}
                  title={rated ? "You've already rated this" : undefined}
                >
                  <div
                    className="poster"
                    style={{ viewTransitionName: `poster-${m.tmdb_id}` } as React.CSSProperties}
                  >
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
                </VTLink>
                <button
                  type="button"
                  className="wl-remove"
                  onClick={() => handleRemove(m.tmdb_id)}
                  disabled={isRemoving}
                  aria-label={`Remove ${m.title} from watchlist`}
                >
                  {isRemoving ? <Spinner size={14} /> : "×"}
                </button>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
