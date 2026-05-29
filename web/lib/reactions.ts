// The fixed set of emoji reactions a viewer can leave on someone's rating
// comment. Stored in the DB as the short `code` (see the
// rating_comment_reactions.reaction check constraint); rendered as `emoji`.
// One reaction per viewer per comment (the table PK enforces this), so picking
// a new emoji replaces the previous one.

export const REACTIONS = [
  { code: "like", emoji: "👍", label: "Like" },
  { code: "love", emoji: "❤️", label: "Loved it" },
  { code: "funny", emoji: "😂", label: "Funny" },
  { code: "mind", emoji: "🤯", label: "Mind-blown" },
  { code: "sad", emoji: "😭", label: "Made me cry" },
  { code: "bored", emoji: "🥱", label: "Boring" },
] as const;

export type ReactionCode = (typeof REACTIONS)[number]["code"];

export const REACTION_CODES: ReactionCode[] = REACTIONS.map((r) => r.code);

export const REACTION_EMOJI: Record<ReactionCode, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.code, r.emoji]),
) as Record<ReactionCode, string>;

export function isReactionCode(value: unknown): value is ReactionCode {
  return typeof value === "string" && REACTION_CODES.includes(value as ReactionCode);
}

// An empty per-code tally, e.g. { like: 0, love: 0, ... }.
export function emptyReactionCounts(): Record<ReactionCode, number> {
  return Object.fromEntries(REACTION_CODES.map((c) => [c, 0])) as Record<
    ReactionCode,
    number
  >;
}
