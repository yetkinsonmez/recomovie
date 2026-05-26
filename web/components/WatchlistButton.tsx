"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToWatchlist, removeFromWatchlist } from "@/app/watchlist/actions";
import { Spinner } from "./Spinner";

export function WatchlistButton({
  tmdbId,
  initialInList,
  isSignedIn,
}: {
  tmdbId: number;
  initialInList: boolean;
  isSignedIn: boolean;
}) {
  const [inList, setInList] = useState(initialInList);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (!isSignedIn) {
      router.push("/login?message=Sign in to use your watchlist");
      return;
    }
    const next = !inList;
    setInList(next);
    setError(null);
    startTransition(async () => {
      const res = next
        ? await addToWatchlist(tmdbId)
        : await removeFromWatchlist(tmdbId);
      if (res && "error" in res) {
        setInList(!next);
        setError(res.error ?? "Watchlist update failed");
      }
    });
  }

  return (
    <div className="watchlist-button-wrap">
      <button
        type="button"
        className={`watchlist-button ${inList ? "is-in" : ""} ${pending ? "is-pending" : ""}`}
        onClick={toggle}
        disabled={pending}
        aria-pressed={inList}
      >
        {pending ? (
          <>
            <Spinner /> <span>Saving…</span>
          </>
        ) : inList ? (
          "✓ In watchlist"
        ) : (
          "+ Watchlist"
        )}
      </button>
      {error && <p className="auth-error" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
