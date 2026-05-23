"use client";

import { useEffect, useRef, useState } from "react";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HeroTrailer({
  videoKey,
  title,
}: {
  videoKey: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = rootRef.current?.closest(".movie-hero");
    hero?.classList.toggle("is-trailer-playing", playing);

    return () => {
      hero?.classList.remove("is-trailer-playing");
    };
  }, [playing]);

  return (
    <div
      ref={rootRef}
      className={
        playing ? "movie-hero-trailer is-playing" : "movie-hero-trailer"
      }
    >
      {playing ? (
        <>
          <iframe
            className="movie-hero-trailer-iframe"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&color=white&playsinline=1&vq=hd1080&hd=1`}
            title={`${title} trailer`}
            width="1920"
            height="1080"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          <button
            type="button"
            className="movie-hero-trailer-close"
            onClick={() => setPlaying(false)}
            aria-label={`Close ${title} trailer`}
          >
            <CloseIcon />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="movie-hero-play"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title} trailer`}
        >
          <PlayIcon />
        </button>
      )}
    </div>
  );
}
