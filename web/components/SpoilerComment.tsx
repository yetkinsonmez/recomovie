"use client";

import { useState } from "react";

// A comment flagged as a spoiler: rendered blurred behind an overlay until the
// reader explicitly opts in. `text` should already be censored upstream.
export function SpoilerComment({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <p className={`${className} spoiler-revealed`}>
        <span className="spoiler-tag">Spoiler</span> {text}
      </p>
    );
  }

  return (
    <button
      type="button"
      className={`${className} spoiler-shield`}
      onClick={() => setRevealed(true)}
      aria-label="Reveal spoiler comment"
    >
      <span className="spoiler-shield-text" aria-hidden="true">
        {text}
      </span>
      <span className="spoiler-shield-overlay">
        <span className="spoiler-shield-icon" aria-hidden="true">
          👁
        </span>
        Spoiler — tap to reveal
      </span>
    </button>
  );
}
