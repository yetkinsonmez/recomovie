"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCommentReaction } from "@/app/movie/actions";
import {
  REACTIONS,
  emptyReactionCounts,
  type ReactionCode,
} from "@/lib/reactions";

export function CommentReactions({
  tmdbId,
  ratingUserId,
  initialCounts,
  initialUserReaction,
  isSignedIn,
  isOwn,
}: {
  tmdbId: number;
  ratingUserId: string;
  initialCounts: Record<ReactionCode, number>;
  initialUserReaction: ReactionCode | null;
  isSignedIn: boolean;
  isOwn: boolean;
}) {
  const [counts, setCounts] = useState<Record<ReactionCode, number>>({
    ...emptyReactionCounts(),
    ...initialCounts,
  });
  const [mine, setMine] = useState<ReactionCode | null>(initialUserReaction);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function react(code: ReactionCode) {
    if (!isSignedIn) {
      router.push("/login?message=Sign in to react");
      return;
    }
    if (isOwn) return;

    const prevMine = mine;
    const prevCounts = counts;

    // Toggle: clicking your current reaction clears it.
    const target: ReactionCode | null = mine === code ? null : code;

    // Optimistic update — remove the old tally, add the new one.
    const nextCounts = { ...counts };
    if (prevMine) nextCounts[prevMine] = Math.max(0, nextCounts[prevMine] - 1);
    if (target) nextCounts[target] += 1;

    setMine(target);
    setCounts(nextCounts);

    startTransition(async () => {
      const res = await setCommentReaction(ratingUserId, tmdbId, target);
      if (res && "error" in res) {
        setMine(prevMine);
        setCounts(prevCounts);
      }
    });
  }

  return (
    <div
      className={`comment-reactions ${isOwn ? "is-readonly" : ""}`}
      aria-label="React to this comment"
    >
      {REACTIONS.map((r) => {
        const count = counts[r.code] ?? 0;
        const active = mine === r.code;
        // On the author's own comment, only show emojis that have a count.
        if (isOwn && count === 0) return null;
        return (
          <button
            key={r.code}
            type="button"
            className={`reaction-chip ${active ? "is-active" : ""}`}
            onClick={() => react(r.code)}
            disabled={pending || isOwn}
            aria-pressed={active}
            aria-label={`${r.label}${count ? ` (${count})` : ""}`}
            title={isOwn ? r.label : active ? `Remove ${r.label}` : r.label}
          >
            <span className="reaction-emoji" aria-hidden="true">
              {r.emoji}
            </span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
