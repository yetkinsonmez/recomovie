"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { avatarSrc } from "@/lib/avatars";
import { censorComment } from "@/lib/censor";
import { CommentReactions } from "./CommentReactions";
import { SpoilerComment } from "./SpoilerComment";
import type { ReactionCode } from "@/lib/reactions";

export interface MovieDiaryEntry {
  rating: number;
  updated_at: string;
  username: string;
  avatar_id: string | null;
  user_id: string;
  comment: string | null;
  is_spoiler: boolean;
  reactions: Record<ReactionCode, number>;
  viewer_reaction: ReactionCode | null;
}

type SortKey = "popular" | "newest" | "highest" | "lowest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Most reacted" },
  { key: "newest", label: "Newest" },
  { key: "highest", label: "Highest rated" },
  { key: "lowest", label: "Lowest rated" },
];

function totalReactions(e: MovieDiaryEntry): number {
  let sum = 0;
  for (const code in e.reactions) sum += e.reactions[code as ReactionCode];
  return sum;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MiniStars({ value }: { value: number }) {
  return (
    <span className="diary-stars" aria-label={`${value.toFixed(1)} out of 10`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
        const fill = value >= i ? "full" : value >= i - 0.5 ? "half" : "empty";
        const width = fill === "full" ? "100%" : fill === "half" ? "50%" : "0%";
        return (
          <span key={i} className="diary-star">
            <svg viewBox="0 0 24 24" className="star-empty">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
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
      })}
    </span>
  );
}

export function MovieDiary({
  entries,
  tmdbId,
  viewerId,
  isSignedIn,
}: {
  entries: MovieDiaryEntry[];
  tmdbId: number;
  viewerId: string | null;
  isSignedIn: boolean;
}) {
  // Default to "most reacted" — the comments people found worth responding to
  // lead, with the rest sorted behind them.
  const [sort, setSort] = useState<SortKey>("popular");

  const sorted = useMemo(() => {
    const list = [...entries];
    const byNewest = (a: MovieDiaryEntry, b: MovieDiaryEntry) =>
      b.updated_at.localeCompare(a.updated_at);
    switch (sort) {
      case "newest":
        return list.sort(byNewest);
      case "highest":
        return list.sort((a, b) => b.rating - a.rating || byNewest(a, b));
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating || byNewest(a, b));
      case "popular":
      default:
        return list.sort(
          (a, b) => totalReactions(b) - totalReactions(a) || byNewest(a, b),
        );
    }
  }, [entries, sort]);

  return (
    <>
      {entries.length > 1 && (
        <div className="diary-sort">
          <span className="diary-sort-label meta">Sort</span>
          <div className="diary-sort-options" role="group" aria-label="Sort comments">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`diary-sort-btn ${sort === s.key ? "is-active" : ""}`}
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="movie-diary-list">
        {sorted.map((e, idx) => (
        <li
          key={`${e.username}-${idx}`}
          className="movie-diary-row reveal-row"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <div className="movie-diary-head">
            <Link href={`/u/${e.username}`} className="movie-diary-user">
              <Image
                src={avatarSrc(e.avatar_id)}
                alt=""
                width={36}
                height={36}
                className="movie-diary-avatar"
              />
              <span className="movie-diary-username">@{e.username}</span>
            </Link>
            <MiniStars value={e.rating} />
            <span className="meta movie-diary-date">
              {formatDate(e.updated_at)}
            </span>
          </div>
          {e.comment &&
            (e.is_spoiler && viewerId !== e.user_id ? (
              <SpoilerComment
                className="movie-diary-comment"
                text={censorComment(e.comment)}
              />
            ) : (
              <p className="movie-diary-comment">
                {e.is_spoiler && (
                  <span className="spoiler-tag">Spoiler</span>
                )}{" "}
                {censorComment(e.comment)}
              </p>
            ))}
          {e.comment && (
            <CommentReactions
              tmdbId={tmdbId}
              ratingUserId={e.user_id}
              initialCounts={e.reactions}
              initialUserReaction={e.viewer_reaction}
              isSignedIn={isSignedIn}
              isOwn={viewerId === e.user_id}
            />
          )}
        </li>
        ))}
      </ul>
    </>
  );
}
