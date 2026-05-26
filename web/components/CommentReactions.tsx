"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCommentReaction } from "@/app/movie/actions";

export function CommentReactions({
  tmdbId,
  ratingUserId,
  initialLikes,
  initialDislikes,
  initialUserReaction,
  isSignedIn,
  isOwn,
}: {
  tmdbId: number;
  ratingUserId: string;
  initialLikes: number;
  initialDislikes: number;
  initialUserReaction: 1 | -1 | 0;
  isSignedIn: boolean;
  isOwn: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [mine, setMine] = useState<1 | -1 | 0>(initialUserReaction);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function react(next: 1 | -1) {
    if (!isSignedIn) {
      router.push("/login?message=Sign in to react");
      return;
    }
    if (isOwn) return;

    const prevMine = mine;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    const target: 1 | -1 | 0 = mine === next ? 0 : next;

    // Optimistic update.
    let nextLikes = likes;
    let nextDislikes = dislikes;
    if (prevMine === 1) nextLikes -= 1;
    if (prevMine === -1) nextDislikes -= 1;
    if (target === 1) nextLikes += 1;
    if (target === -1) nextDislikes += 1;

    setMine(target);
    setLikes(nextLikes);
    setDislikes(nextDislikes);

    startTransition(async () => {
      const res = await setCommentReaction(ratingUserId, tmdbId, target);
      if (res && "error" in res) {
        setMine(prevMine);
        setLikes(prevLikes);
        setDislikes(prevDislikes);
      }
    });
  }

  return (
    <div className="comment-reactions" aria-label="React to this comment">
      <button
        type="button"
        className={`reaction-btn ${mine === 1 ? "is-active" : ""}`}
        onClick={() => react(1)}
        disabled={pending || isOwn}
        aria-pressed={mine === 1}
        aria-label="Like comment"
        title={isOwn ? "You can't react to your own comment" : "Like"}
      >
        <span aria-hidden="true">▲</span>
        <span>{likes}</span>
      </button>
      <button
        type="button"
        className={`reaction-btn ${mine === -1 ? "is-active is-down" : ""}`}
        onClick={() => react(-1)}
        disabled={pending || isOwn}
        aria-pressed={mine === -1}
        aria-label="Dislike comment"
        title={isOwn ? "You can't react to your own comment" : "Dislike"}
      >
        <span aria-hidden="true">▼</span>
        <span>{dislikes}</span>
      </button>
    </div>
  );
}
