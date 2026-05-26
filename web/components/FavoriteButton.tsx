"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFavorite, removeFavorite } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

export function FavoriteButton({
  tmdbId,
  initialIsFavorite,
  isSignedIn,
}: {
  tmdbId: number;
  initialIsFavorite: boolean;
  isSignedIn: boolean;
}) {
  const [isFav, setIsFav] = useState(initialIsFavorite);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (!isSignedIn) {
      router.push(`/login?message=Sign in to save favorites`);
      return;
    }
    const next = !isFav;
    setIsFav(next);
    setError(null);
    startTransition(async () => {
      const res = next ? await addFavorite(tmdbId) : await removeFavorite(tmdbId);
      if (res && "error" in res) {
        setIsFav(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="fav-button-wrap">
      <button
        type="button"
        className={`fav-button ${isFav ? "is-fav" : ""} ${pending ? "is-pending" : ""}`}
        onClick={toggle}
        disabled={pending}
        aria-pressed={isFav}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Spinner /> <span>Saving…</span>
          </>
        ) : isFav ? (
          "♥ Favorited"
        ) : (
          "♡ Favorite"
        )}
      </button>
      {error && <p className="auth-error" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
