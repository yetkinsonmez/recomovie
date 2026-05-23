"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
];

const SORTS = [
  { value: "popularity", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "A–Z" },
];

function SearchIcon() {
  return (
    <svg
      className="search-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="select-chevron"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Controls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const currentGenre = searchParams.get("genre") ?? "";
  const currentSort = searchParams.get("sort") ?? "popularity";

  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change returns to page 1
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounce the search box so we navigate ~once the user pauses typing.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query === current) return;
    const timer = setTimeout(() => navigate({ q: query }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="controls">
      <div className="search-wrap">
        <span className="control-label">Title</span>
        <SearchIcon />
        <input
          className="search"
          type="search"
          placeholder="Search movies by title…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <label className="select-wrap">
        <span className="control-label">Genre</span>
        <select
          className="select"
          value={currentGenre}
          onChange={(event) => navigate({ genre: event.target.value })}
        >
          <option value="">All genres</option>
          {GENRES.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </label>
      <label className="select-wrap">
        <span className="control-label">Sort by</span>
        <select
          className="select"
          value={currentSort}
          onChange={(event) => navigate({ sort: event.target.value })}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </label>
    </div>
  );
}
