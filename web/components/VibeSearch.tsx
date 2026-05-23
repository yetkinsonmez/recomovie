"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PLACEHOLDERS = [
  "a mind-bending sci-fi that messes with reality",
  "something cozy and heartwarming for a rainy night",
  "an edge-of-your-seat tense thriller",
  "an epic adventure with a long, perilous journey",
  "a slow-burn mystery in a small town",
  "dark, suspenseful, twists"
];

const CHIPS = [
  "Mind-bending sci-fi",
  "Lovely & heartwarming",
  "Edge-of-seat thriller",
  "Epic adventure",
  "Lonely man",
  "I want to cry",
  "Parallel realities",
  "Detective story",
  "Feel good, good vibe",
  "Suspenseful, twists"
];

function SearchIcon() {
  return (
    <svg
      className="vibe-form-icon"
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h13m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FindingIndicator() {
  return (
    <span className="finding-indicator" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function VibeSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("mood") ?? "");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    startTransition(() => {
      router.push(`/?mood=${encodeURIComponent(trimmed)}`);
    });
  }

  return (
    <div className={compact ? "vibe vibe-compact" : "vibe"}>
      <form
        className="vibe-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
      >
        <SearchIcon />
        <input
          className="vibe-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Try: ${PLACEHOLDERS[placeholderIndex]}…`}
          aria-label="Describe the kind of movie you want to watch"
        />
        <button className="vibe-btn" type="submit" disabled={isPending}>
          <span className="vibe-btn-bg" aria-hidden="true" />
          <span className="vibe-btn-content">
            {isPending ? (
              <>
                <FindingIndicator />
                Finding
              </>
            ) : (
              <>
                Find
                <ArrowIcon />
              </>
            )}
          </span>
        </button>
      </form>

      {!compact && (
        <div className="vibe-examples">
          <span className="vibe-examples-label">or try</span>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="vibe-chip"
              onClick={() => submit(chip)}
              disabled={isPending}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
