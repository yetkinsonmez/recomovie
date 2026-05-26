"use client";

import { useState } from "react";
import Image from "next/image";

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
  const [thumb, setThumb] = useState(
    `https://i.ytimg.com/vi/${videoKey}/maxresdefault.jpg`,
  );

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
      <Image
        src={thumb}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 640px"
        unoptimized
        onError={() => {
          // maxresdefault doesn't exist for every video; fall back gracefully.
          if (!thumb.includes("hqdefault")) {
            setThumb(`https://i.ytimg.com/vi/${videoKey}/hqdefault.jpg`);
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
