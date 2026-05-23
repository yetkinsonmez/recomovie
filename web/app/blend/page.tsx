"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/MovieCard";
import { MoviePicker } from "@/components/MoviePicker";
import type { Movie, Recommendation } from "@/lib/types";

type Status = "idle" | "blending" | "results";

// Minimum animation duration; results wait for both this and the RPC.
const COLLISION_MS = 1100;

export default function BlendPage() {
  const [slotA, setSlotA] = useState<Movie | null>(null);
  const [slotB, setSlotB] = useState<Movie | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Recommendation[]>([]);

  const sameMovie = !!(slotA && slotB && slotA.tmdb_id === slotB.tmdb_id);
  const canBlend =
    slotA !== null && slotB !== null && !sameMovie && status !== "blending";

  async function handleBlend() {
    if (!slotA || !slotB || sameMovie) return;
    setStatus("blending");
    setResults([]);

    const wait = new Promise<void>((resolve) =>
      setTimeout(resolve, COLLISION_MS),
    );
    const rpc = supabase.rpc("blend_movies", {
      p_tmdb_id_a: slotA.tmdb_id,
      p_tmdb_id_b: slotB.tmdb_id,
      p_count: 18,
    });

    const [, response] = await Promise.all([wait, rpc]);
    setResults(((response.data ?? []) as Recommendation[]) ?? []);
    setStatus("results");
  }

  function clearSlot(slot: "a" | "b") {
    if (slot === "a") setSlotA(null);
    else setSlotB(null);
    if (status === "results") setStatus("idle");
  }

  function pickSlot(slot: "a" | "b", movie: Movie) {
    if (slot === "a") setSlotA(movie);
    else setSlotB(movie);
    if (status === "results") setStatus("idle");
  }

  const arenaClass = `blend-arena${status === "blending" ? " is-blending" : ""}`;
  const pageClass = `container blend-page blend-status-${status}`;

  return (
    <main className={pageClass}>
      <span className="blend-orb blend-orb-1" aria-hidden="true" />
      <span className="blend-orb blend-orb-2" aria-hidden="true" />
      <span className="blend-orb blend-orb-3" aria-hidden="true" />

      <header className="blend-hero">
        <p className="blend-eyebrow">Discover by combination</p>
        <h1 className="blend-title">Movie Blender</h1>
        <p className="blend-sub">
          Pick two films you love. We&rsquo;ll find the films that sit between
          them.
        </p>
      </header>

      <div className={arenaClass}>
        <div className="blend-slot-wrap">
          <span className="blend-slot-label">Film one</span>
          <MoviePicker
            picked={slotA}
            onPick={(movie) => pickSlot("a", movie)}
            onClear={() => clearSlot("a")}
          />
        </div>

        <div className="blend-connector" aria-hidden="true">
          <span className="blend-burst" />
          <span className="blend-plus">+</span>
        </div>

        <div className="blend-slot-wrap">
          <span className="blend-slot-label">Film two</span>
          <MoviePicker
            picked={slotB}
            onPick={(movie) => pickSlot("b", movie)}
            onClear={() => clearSlot("b")}
          />
        </div>
      </div>

      <div className="blend-action">
        {sameMovie && (
          <p className="blend-warning">Pick two different films to blend.</p>
        )}
        <button
          type="button"
          className="blend-btn"
          disabled={!canBlend}
          onClick={handleBlend}
        >
          <span className="blend-btn-bg" aria-hidden="true" />
          <span className="blend-btn-content">
            {status === "blending" ? (
              <>
                <span className="blend-loader" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Blending
              </>
            ) : (
              <>
                Blend movies
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="blend-btn-arrow"
                  aria-hidden="true"
                >
                  <path d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </>
            )}
          </span>
        </button>
      </div>

      {status === "results" && (
        <section className="blend-results">
          <h2>Blended recommendations</h2>
          {results.length === 0 ? (
            <p className="error">No matches — try a different pair.</p>
          ) : (
            <div className="grid">
              {results.map((movie) => (
                <MovieCard key={movie.tmdb_id} movie={movie} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
