"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import type { Movie } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { addFavorite, removeFavorite } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

const MAX_FAVORITES = 4;

export function FavoriteMovies({ initial }: { initial: Movie[] }) {
  const [favorites, setFavorites] = useState<Movie[]>(initial.slice(0, MAX_FAVORITES));
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const slots: (Movie | null)[] = Array.from(
    { length: MAX_FAVORITES },
    (_, i) => favorites[i] ?? null,
  );

  function openSlot(idx: number) {
    setPickingSlot(idx);
  }

  function handleAdded(movie: Movie) {
    setAddingId(movie.tmdb_id);
    setFavorites((prev) => [...prev, movie]);
    setPickingSlot(null);
    startTransition(async () => {
      const res = await addFavorite(movie.tmdb_id);
      setAddingId(null);
      if (res && "error" in res) {
        setFavorites((prev) =>
          prev.filter((m) => m.tmdb_id !== movie.tmdb_id),
        );
      }
    });
  }

  function handleRemove(tmdbId: number) {
    const snapshot = favorites;
    setRemovingId(tmdbId);
    setFavorites((prev) => prev.filter((m) => m.tmdb_id !== tmdbId));
    startTransition(async () => {
      const res = await removeFavorite(tmdbId);
      setRemovingId(null);
      if (res && "error" in res) setFavorites(snapshot);
    });
  }

  return (
    <>
      <div className="fav-slots">
        {slots.map((movie, idx) => {
          if (movie) {
            const isRemoving = removingId === movie.tmdb_id;
            const isAdding = addingId === movie.tmdb_id;
            return (
              <div key={`slot-${idx}`} className="fav-slot fav-slot-filled">
                <Link
                  href={`/movie/${movie.tmdb_id}`}
                  className="fav-slot-poster"
                  aria-label={movie.title}
                >
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 220px"
                    />
                  ) : (
                    <div className="poster-empty">No image</div>
                  )}
                  {(isAdding || isRemoving) && (
                    <span className="fav-slot-overlay">
                      <Spinner size={24} />
                    </span>
                  )}
                </Link>
                <div className="fav-slot-foot">
                  <span className="fav-slot-title" title={movie.title}>
                    {movie.title}
                  </span>
                  <button
                    type="button"
                    className="fav-slot-remove"
                    disabled={isRemoving || isAdding}
                    onClick={() => handleRemove(movie.tmdb_id)}
                    aria-label={`Remove ${movie.title}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          }

          return (
            <button
              type="button"
              key={`slot-${idx}`}
              className="fav-slot fav-slot-empty"
              onClick={() => openSlot(idx)}
            >
              <span className="fav-slot-plus">+</span>
              <span className="fav-slot-hint">Add a favorite</span>
            </button>
          );
        })}
      </div>

      {pickingSlot !== null && (
        <PickerModal
          existingIds={favorites.map((m) => m.tmdb_id)}
          onClose={() => setPickingSlot(null)}
          onPick={handleAdded}
        />
      )}
    </>
  );
}

function PickerModal({
  existingIds,
  onClose,
  onPick,
}: {
  existingIds: number[];
  onClose: () => void;
  onPick: (movie: Movie) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Portal target — only available after mount on the client.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("movies")
        .select(
          "tmdb_id,title,poster_url,release_date,vote_average,genres_text",
        )
        .ilike("title", `%${q}%`)
        .order("vote_average", { ascending: false, nullsFirst: false })
        .limit(12);
      setResults((data ?? []) as Movie[]);
      setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (!mounted) return null;

  return createPortal(
    <div className="fav-modal" onClick={onClose}>
      <div
        className="fav-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Pick a favorite movie"
      >
        <div className="fav-modal-search">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie…"
            className="auth-input"
          />
          {searching && (
            <span className="fav-modal-spinner">
              <Spinner size={18} />
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="link-button"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="fav-modal-results">
          {results.length === 0 && !searching && query.trim().length >= 2 && (
            <p className="meta" style={{ padding: "1rem" }}>
              No matches.
            </p>
          )}
          {results.length === 0 && query.trim().length < 2 && (
            <p className="meta" style={{ padding: "1rem" }}>
              Type at least two letters.
            </p>
          )}
          {results.map((m) => {
            const already = existingIds.includes(m.tmdb_id);
            return (
              <button
                key={m.tmdb_id}
                type="button"
                className="fav-modal-row"
                disabled={already}
                onClick={() => onPick(m)}
              >
                {m.poster_url ? (
                  <Image
                    src={m.poster_url}
                    alt=""
                    width={40}
                    height={60}
                    className="fav-modal-row-poster"
                  />
                ) : (
                  <span className="favorites-poster-empty" />
                )}
                <span className="fav-modal-meta">
                  <span className="fav-modal-title">{m.title}</span>
                  {m.release_date && (
                    <span className="meta">{m.release_date.slice(0, 4)}</span>
                  )}
                </span>
                <span className="favorites-add">
                  {already ? "Added" : "+ Pick"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
