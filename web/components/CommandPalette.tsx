"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Result = {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  release_date: string | null;
  vote_average: number | null;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  // The movie we're navigating to: drives the row spinner + top progress bar so
  // there's continuous feedback from "Enter" until the movie page commits,
  // instead of the palette vanishing into a blank gap.
  const [goingTo, setGoingTo] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Portals need the DOM; only render the overlay after mount.
  useEffect(() => setMounted(true), []);

  // Global ⌘K / Ctrl+K to open, Escape handled inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the field and reset state whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced search against /api/search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { results?: Result[] };
        setResults(json.results ?? []);
        setActive(0);
      } catch {
        // aborted or network error — ignore; keep last results
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (tmdbId: number) => {
      if (goingTo !== null) return; // already navigating
      setGoingTo(tmdbId);
      // Keep the palette mounted while the route loads; the transition stays
      // pending until the movie page (its loading.tsx) is ready, then we close.
      startTransition(() => {
        router.push(`/movie/${tmdbId}`);
      });
    },
    [router, goingTo],
  );

  // Close the palette once the navigation has committed.
  useEffect(() => {
    if (goingTo !== null && !isPending) {
      setOpen(false);
      setGoingTo(null);
    }
  }, [goingTo, isPending]);

  // Reset navigation state whenever the palette is dismissed.
  useEffect(() => {
    if (!open) setGoingTo(null);
  }, [open]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) go(pick.tmdb_id);
    }
  }

  // Keep the active row scrolled into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const overlay =
    open && mounted
      ? createPortal(
          <div className="cmdk-overlay" role="presentation" onMouseDown={close}>
            <div
              className="cmdk-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Search movies"
              aria-busy={isPending}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {isPending && (
                <span className="cmdk-progress" aria-hidden="true" />
              )}
              <div className="cmdk-input-row">
                <span className="cmdk-input-icon">
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  className="cmdk-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search movies, directors, cast…"
                  aria-label="Search movies"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="cmdk-esc">Esc</kbd>
              </div>

              <ul className="cmdk-results" ref={listRef} role="listbox">
                {query.trim().length < 2 ? (
                  <li className="cmdk-hint">Type at least 2 characters…</li>
                ) : loading && results.length === 0 ? (
                  <li className="cmdk-hint">Searching…</li>
                ) : results.length === 0 ? (
                  <li className="cmdk-hint">No matches for “{query.trim()}”.</li>
                ) : (
                  results.map((r, i) => {
                    const year = r.release_date ? r.release_date.slice(0, 4) : "";
                    return (
                      <li key={r.tmdb_id} role="option" aria-selected={i === active}>
                        <button
                          type="button"
                          data-index={i}
                          className={`cmdk-result${i === active ? " is-active" : ""}${goingTo === r.tmdb_id ? " is-loading" : ""}`}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(r.tmdb_id)}
                        >
                          {r.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="cmdk-poster" src={r.poster_url} alt="" loading="lazy" />
                          ) : (
                            <span className="cmdk-poster cmdk-poster-empty" aria-hidden="true" />
                          )}
                          <span className="cmdk-result-text">
                            <span className="cmdk-result-title">{r.title}</span>
                            <span className="cmdk-result-meta">
                              {year}
                              {r.vote_average ? ` · ★ ${r.vote_average.toFixed(1)}` : ""}
                            </span>
                          </span>
                          {goingTo === r.tmdb_id && (
                            <span className="cmdk-result-spinner" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="cmdk-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
                <span><kbd>↵</kbd> to open</span>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="cmdk-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search movies"
      >
        <SearchIcon />
        <span className="cmdk-trigger-label">Search movies, directors, cast…</span>
      </button>
      {overlay}
    </>
  );
}
