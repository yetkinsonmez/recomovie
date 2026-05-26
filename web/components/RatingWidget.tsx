"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  rateMovie,
  removeRating,
  setRatingComment,
} from "@/app/movie/actions";
import { Spinner } from "./Spinner";

const COMMENT_MAX = 2000;

function StarShape({ fill }: { fill: "empty" | "half" | "full" }) {
  // Two stacked stars — empty silhouette behind, gold "fill" on top, clipped
  // to 0% / 50% / 100% width.
  const width = fill === "full" ? "100%" : fill === "half" ? "50%" : "0%";
  return (
    <span className="star-shape" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="star-empty">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="M12 3l2.7 5.9 6.3.6-4.7 4.3 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.5l6.3-.6L12 3z"
        />
      </svg>
      <span className="star-fill-clip" style={{ width }}>
        <svg viewBox="0 0 24 24" className="star-full">
          <path
            fill="currentColor"
            d="M12 3l2.7 5.9 6.3.6-4.7 4.3 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.5l6.3-.6L12 3z"
          />
        </svg>
      </span>
    </span>
  );
}

export function RatingWidget({
  tmdbId,
  initialRating,
  initialComment,
  isSignedIn,
}: {
  tmdbId: number;
  initialRating: number | null;
  initialComment?: string | null;
  isSignedIn: boolean;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string>(initialComment ?? "");
  const [savedComment, setSavedComment] = useState<string>(
    initialComment ?? "",
  );
  const [commentPending, startCommentTransition] = useTransition();
  const [commentError, setCommentError] = useState<string | null>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const shown = hover ?? rating ?? 0;
  const canComment = rating !== null;
  const commentDirty = comment.trim() !== savedComment.trim();

  // Auto-grow: reset height to allow shrink, then match scrollHeight. Capped
  // by CSS max-height so very long comments scroll inside the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [comment, canComment]);

  function fillFor(starIndex: number): "empty" | "half" | "full" {
    if (shown >= starIndex) return "full";
    if (shown >= starIndex - 0.5) return "half";
    return "empty";
  }

  function setTo(value: number) {
    if (!isSignedIn) {
      router.push("/login?message=Sign in to rate movies");
      return;
    }
    const prev = rating;
    setRating(value);
    setError(null);
    startTransition(async () => {
      // Keep the comment on the row when we (re)write the rating.
      const res = await rateMovie(tmdbId, value, savedComment || null);
      if (res && "error" in res) {
        setRating(prev);
        setError(res.error ?? "Rating update failed");
      }
    });
  }

  function clear() {
    if (rating === null) return;
    const prev = rating;
    setRating(null);
    setError(null);
    startTransition(async () => {
      const res = await removeRating(tmdbId);
      if (res && "error" in res) {
        setRating(prev);
        setError(res.error ?? "Rating update failed");
      } else {
        setComment("");
        setSavedComment("");
      }
    });
  }

  function saveComment() {
    if (!canComment || !commentDirty) return;
    const next = comment.trim();
    setCommentError(null);
    startCommentTransition(async () => {
      const res = await setRatingComment(tmdbId, next || null);
      if (res && "error" in res) {
        setCommentError(res.error ?? "Could not save comment");
      } else {
        setSavedComment(next);
      }
    });
  }

  return (
    <div className="rating-widget">
      <div className="rating-row">
        <div
          className={`rating-stars ${pending ? "is-pending" : ""}`}
          onMouseLeave={() => setHover(null)}
          role="radiogroup"
          aria-label="Your rating, out of 10"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <span key={i} className="star-wrap">
              <StarShape fill={fillFor(i)} />
              <button
                type="button"
                className="star-hit star-hit-half"
                onMouseEnter={() => setHover(i - 0.5)}
                onClick={() => setTo(i - 0.5)}
                aria-label={`Rate ${i - 0.5} out of 10`}
                disabled={pending}
              />
              <button
                type="button"
                className="star-hit star-hit-full"
                onMouseEnter={() => setHover(i)}
                onClick={() => setTo(i)}
                aria-label={`Rate ${i} out of 10`}
                disabled={pending}
              />
            </span>
          ))}
        </div>

        <div className="rating-readout">
          {pending ? (
            <Spinner size={16} />
          ) : shown ? (
            <strong>{shown.toFixed(1)}</strong>
          ) : (
            <span className="meta">– / 10</span>
          )}
          {rating !== null && !pending && (
            <button
              type="button"
              className="link-button"
              onClick={clear}
              aria-label="Remove your rating"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {!isSignedIn && (
        <p className="meta rating-hint">Sign in to rate this film.</p>
      )}
      {rating !== null && !pending && (
        <p className="meta rating-hint">
          You rated this <strong>{rating.toFixed(1)} / 10</strong>.
        </p>
      )}
      {error && <p className="auth-error rating-hint">{error}</p>}

      {isSignedIn && (
        <div className="rating-comment">
          <label htmlFor={`rating-comment-${tmdbId}`} className="meta">
            {canComment
              ? "Add a comment (optional)"
              : "Rate the film to leave a comment"}
          </label>
          <textarea
            ref={textareaRef}
            id={`rating-comment-${tmdbId}`}
            className="rating-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
            disabled={!canComment || commentPending}
            placeholder={
              canComment
                ? "Share what you thought…"
                : "Pick a star rating above first."
            }
            rows={2}
            maxLength={COMMENT_MAX}
          />
          <div className="rating-comment-foot">
            <span className="meta">
              {comment.length}/{COMMENT_MAX}
            </span>
            <button
              type="button"
              className="auth-button rating-comment-save"
              onClick={saveComment}
              disabled={!canComment || !commentDirty || commentPending}
            >
              {commentPending ? (
                <Spinner size={14} />
              ) : savedComment ? (
                "Update comment"
              ) : (
                "Save comment"
              )}
            </button>
          </div>
          {commentError && (
            <p className="auth-error rating-hint">{commentError}</p>
          )}
        </div>
      )}
    </div>
  );
}
