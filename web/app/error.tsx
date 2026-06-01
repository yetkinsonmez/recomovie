"use client";

import { useEffect } from "react";
import Link from "next/link";

// A clapperboard with its top bar flung open — the take that went wrong.
function Clapperboard() {
  return (
    <svg className="errp-clap" viewBox="0 0 100 100" aria-hidden="true">
      <rect
        x="15"
        y="44"
        width="70"
        height="40"
        rx="7"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <g transform="rotate(-11 18 36)">
        <rect x="15" y="25" width="70" height="15" rx="4" fill="currentColor" />
        <path
          d="M29 25 L22 40 M43 25 L36 40 M57 25 L50 40 M71 25 L64 40"
          stroke="var(--card)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the failure to the console / error reporting in dev and prod.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="errp">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="errp-inner">
        <p className="errp-eyebrow">✦ Technical difficulties</p>

        <div className="errp-art">
          <Clapperboard />
        </div>

        <h1 className="errp-title">The reel jammed</h1>
        <p className="errp-sub">
          Something broke while loading this page. It’s usually momentary —
          give it another take.
        </p>

        <div className="errp-actions">
          <button
            type="button"
            className="errp-btn errp-btn-primary"
            onClick={reset}
          >
            Try again
          </button>
          <Link href="/" className="errp-btn errp-btn-ghost">
            Back to home
          </Link>
        </div>

        {error.digest && (
          <p className="errp-detail">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
