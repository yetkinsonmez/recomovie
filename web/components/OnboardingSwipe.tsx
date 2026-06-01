"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rateMovie } from "@/app/movie/actions";
import { Spinner } from "./Spinner";
import type { Movie } from "@/lib/types";

// How many "loved/meh" verdicts before the taste vector is worth building a
// feed from. The user can keep going past this, but the build button unlocks
// here.
const MIN_RATED = 3;

// Loved → a strong positive that clears the For-You centroid threshold (≥6);
// Meh → a low score that's recorded (so it's filtered from recs) but excluded
// from the positive taste vector.
const LOVED = 9.0;
const MEH = 5.0;

export function OnboardingSwipe({ movies }: { movies: Movie[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const [building, setBuilding] = useState(false);

  const done = index >= movies.length;
  const current = movies[index];

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const verdict = useCallback(
    (kind: "loved" | "meh" | "skip") => {
      if (pending || !current) return;
      if (kind === "skip") {
        advance();
        return;
      }
      const rating = kind === "loved" ? LOVED : MEH;
      const tmdbId = current.tmdb_id;
      // Optimistic: move to the next card immediately, record in the
      // background. rateMovie upserts + leans on RLS; no revalidate, so it's
      // snappy.
      setRatedCount((c) => c + 1);
      advance();
      startTransition(async () => {
        await rateMovie(tmdbId, rating);
      });
    },
    [pending, current, advance],
  );

  const build = useCallback(() => {
    setBuilding(true);
    // Re-render the home server component — now that ratings exist, the For You
    // and "Because you rated" rows take over and this onboarding block drops.
    startTransition(() => router.refresh());
  }, [router]);

  // Keyboard: ← meh, → loved, ↓/space skip.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") verdict("loved");
      else if (e.key === "ArrowLeft") verdict("meh");
      else if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        verdict("skip");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, verdict]);

  const canBuild = ratedCount >= MIN_RATED;

  if (done) {
    return (
      <div className="onboard-done">
        {canBuild ? (
          <>
            <p className="onboard-done-title">
              Nice — {ratedCount} {ratedCount === 1 ? "rating" : "ratings"} in.
            </p>
            <p className="meta">
              That's enough to read your taste. Build your personalised feed.
            </p>
            <button
              type="button"
              className="onboard-build"
              onClick={build}
              disabled={building}
            >
              {building ? <Spinner size={16} /> : "Build my feed →"}
            </button>
          </>
        ) : (
          <>
            <p className="onboard-done-title">That's the lot for now.</p>
            <p className="meta">
              Rate a few more films to unlock a personalised feed.{" "}
              <Link href="/movies" className="link-accent">
                Browse the catalog →
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  const year = current.release_date ? current.release_date.slice(0, 4) : "";

  return (
    <div className="onboard">
      <div className="onboard-progress" aria-hidden="true">
        {movies.map((m, i) => (
          <span
            key={m.tmdb_id}
            className={`onboard-dot ${i < index ? "is-done" : ""} ${i === index ? "is-current" : ""}`}
          />
        ))}
      </div>

      {/* A shallow stack: the next two posters peek behind the active card. */}
      <div className="onboard-stack">
        {[2, 1].map((offset) => {
          const peek = movies[index + offset];
          if (!peek?.poster_url) return null;
          return (
            <div
              key={peek.tmdb_id}
              className="onboard-peek"
              style={{ "--o": offset } as React.CSSProperties}
              aria-hidden="true"
            >
              <Image src={peek.poster_url} alt="" fill sizes="280px" />
            </div>
          );
        })}

        <div key={current.tmdb_id} className="onboard-card">
          <div className="onboard-poster">
            {current.poster_url ? (
              <Image
                src={current.poster_url}
                alt={current.title}
                fill
                sizes="280px"
                priority
              />
            ) : (
              <div className="poster-empty">No image</div>
            )}
            {current.vote_average ? (
              <span className="rating-chip">
                ★ {current.vote_average.toFixed(1)}
              </span>
            ) : null}
          </div>
          <div className="onboard-card-body">
            <h3 className="onboard-card-title">{current.title}</h3>
            {year && <span className="meta">{year}</span>}
          </div>
        </div>
      </div>

      <div className="onboard-actions">
        <button
          type="button"
          className="onboard-btn onboard-btn-meh"
          onClick={() => verdict("meh")}
          aria-label="Meh — it was okay"
        >
          😐 Meh
        </button>
        <button
          type="button"
          className="onboard-btn onboard-btn-skip"
          onClick={() => verdict("skip")}
          aria-label="Haven't seen it"
        >
          Haven&rsquo;t seen
        </button>
        <button
          type="button"
          className="onboard-btn onboard-btn-loved"
          onClick={() => verdict("loved")}
          aria-label="Loved it"
        >
          ❤ Loved it
        </button>
      </div>

      <p className="onboard-hint meta">
        {ratedCount > 0
          ? `${ratedCount} rated${canBuild ? " — keep going or build your feed below" : ` · ${MIN_RATED - ratedCount} more to unlock your feed`}`
          : "Rate films you've actually seen — skip the rest."}
      </p>

      {canBuild && (
        <button
          type="button"
          className="onboard-build onboard-build-inline"
          onClick={build}
          disabled={building}
        >
          {building ? <Spinner size={16} /> : "Build my feed →"}
        </button>
      )}
    </div>
  );
}
