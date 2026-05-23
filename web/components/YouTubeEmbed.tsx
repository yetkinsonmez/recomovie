"use client";

import { useState } from "react";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function YouTubeEmbed({
  videoKey,
  title,
}: {
  videoKey: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        className="trailer-iframe"
        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&color=white`}
        title={`${title} trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      className="trailer-thumb"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title} trailer`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${videoKey}/maxresdefault.jpg`}
        alt=""
        loading="lazy"
        onError={(event) => {
          // maxresdefault doesn't exist for every video; fall back gracefully
          const img = event.currentTarget;
          if (!img.src.includes("hqdefault")) {
            img.src = `https://i.ytimg.com/vi/${videoKey}/hqdefault.jpg`;
          }
        }}
      />
      <span className="trailer-thumb-scrim" aria-hidden="true" />
      <span className="trailer-play-btn" aria-hidden="true">
        <PlayIcon />
      </span>
    </button>
  );
}
