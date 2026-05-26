"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";

export function MoviePicker({
  picked,
  onPick,
  onClear,
  placeholder = "Search a film…",
}: {
  picked: Movie | null;
  onPick: (movie: Movie) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced title search against Supabase.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || picked) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("movies")
        .select("tmdb_id,title,poster_url,release_date,vote_average,genres_text")
        .ilike("title", `%${trimmed}%`)
        .order("popularity", { ascending: false, nullsFirst: false })
        .limit(8)
        .abortSignal(controller.signal);
      if (!controller.signal.aborted) setResults((data ?? []) as Movie[]);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, picked]);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (picked) {
    return (
      <div className="picker picker-filled">
        <div className="picker-poster">
          {picked.poster_url ? (
            <Image
              src={picked.poster_url}
              alt={picked.title}
              fill
              sizes="(max-width: 768px) 50vw, 320px"
            />
          ) : (
            <div className="poster-empty">No image</div>
          )}
          <div className="picker-meta">
            <p className="picker-title">{picked.title}</p>
            {picked.release_date && (
              <p className="picker-year">{picked.release_date.slice(0, 4)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          className="picker-change"
          onClick={() => {
            onClear();
            setQuery("");
            // refocus shortly after the picker re-renders as empty
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="picker picker-empty">
      <input
        ref={inputRef}
        type="text"
        className="picker-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label="Search for a movie"
      />
      {open && results.length > 0 && (
        <ul className="picker-results">
          {results.map((movie) => (
            <li key={movie.tmdb_id}>
              <button
                type="button"
                onClick={() => {
                  onPick(movie);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
              >
                <div className="picker-result-poster">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt=""
                      fill
                      sizes="34px"
                    />
                  ) : null}
                </div>
                <span className="picker-result-title">{movie.title}</span>
                {movie.release_date && (
                  <span className="picker-result-year">
                    {movie.release_date.slice(0, 4)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
