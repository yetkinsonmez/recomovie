// ─────────────────────────────────────────────────────────────────────────────
// Profile stats: "critic personality" (your ratings vs the crowd) + badges.
//
// These are pure functions over a normalized list of the user's ratings, so
// they're trivial to unit-test and are shared by the owner's profile and the
// public /u/[username] page. Data fetching lives in lib/profileStats.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface RatingDatum {
  rating: number; // the user's score, 0.5–10
  voteAverage: number | null; // the film's crowd average (≈ site/TMDB consensus)
  genres: string[]; // parsed from movies.genres_text
  director: string | null;
  ratedAt: string; // ISO timestamp
}

// ── Critic personality ──────────────────────────────────────────────────────

export interface GenreStat {
  genre: string;
  count: number; // films in this genre that have a crowd average
  youAvg: number; // your mean rating, 0–10
  crowdAvg: number; // crowd mean rating over the same films, 0–10
  delta: number; // youAvg − crowdAvg  (+ = more generous than the crowd)
}

/**
 * Per-genre comparison of the user's ratings against the crowd average of the
 * very same films. Only films that have a crowd average count, so the delta is
 * apples-to-apples. Returns the genres with the most rated films first.
 */
export function computeCriticProfile(
  data: RatingDatum[],
  opts: { minCount?: number; top?: number } = {},
): GenreStat[] {
  const minCount = opts.minCount ?? 3;
  const top = opts.top ?? 6;

  const acc = new Map<string, { you: number; crowd: number; n: number }>();
  for (const d of data) {
    if (d.voteAverage == null) continue;
    for (const g of d.genres) {
      const cur = acc.get(g) ?? { you: 0, crowd: 0, n: 0 };
      cur.you += d.rating;
      cur.crowd += d.voteAverage;
      cur.n += 1;
      acc.set(g, cur);
    }
  }

  return Array.from(acc.entries())
    .map(([genre, v]) => {
      const youAvg = v.you / v.n;
      const crowdAvg = v.crowd / v.n;
      return {
        genre,
        count: v.n,
        youAvg: round1(youAvg),
        crowdAvg: round1(crowdAvg),
        delta: round1(youAvg - crowdAvg),
      };
    })
    .filter((s) => s.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Badges ───────────────────────────────────────────────────────────────────

export type BadgeCategory = "volume" | "taste" | "social";

export interface Badge {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  icon: string; // emoji glyph
  earned: boolean;
  progress: number; // current value toward target
  target: number; // value needed to earn
  /** % of active users who have earned this badge (0–100), if known. */
  rarity?: number;
}

// Tiered ladders — every tier is shown (Steam-style), earned ones lit up and
// locked ones dimmed with a progress hint.
const VOLUME_TIERS: { id: string; name: string; icon: string; target: number }[] =
  [
    { id: "vol-10", name: "Moviegoer", icon: "🎟️", target: 10 },
    { id: "vol-50", name: "Cinephile", icon: "🎬", target: 50 },
    { id: "vol-100", name: "Centurion", icon: "💯", target: 100 },
    { id: "vol-250", name: "Film Buff", icon: "🍿", target: 250 },
    { id: "vol-500", name: "Archivist", icon: "📼", target: 500 },
    { id: "vol-1000", name: "Completionist", icon: "👑", target: 1000 },
  ];

const SOCIAL_TIERS: { id: string; name: string; icon: string; target: number }[] =
  [
    { id: "soc-10", name: "Quotable", icon: "💬", target: 10 },
    { id: "soc-50", name: "Tastemaker", icon: "⭐", target: 50 },
    { id: "soc-200", name: "Influencer", icon: "🔥", target: 200 },
  ];

// Targets exposed so the rarity SQL function (which counts, across all users,
// how many cross each threshold) stays driven by these same numbers.
export const VOLUME_TARGETS = VOLUME_TIERS.map((t) => t.target);
export const SOCIAL_TARGETS = SOCIAL_TIERS.map((t) => t.target);
export const AUTEUR_TARGET = 10;
export const GENRE_TOURIST_TARGET = 8;

export interface BadgeInputs {
  ratedCount: number; // total films rated
  auteurCount: number; // films by "Tarkovsky-adjacent" auteurs
  maxGenresInMonth: number; // most distinct genres rated within one calendar month
  commentLikes: number; // total emoji reactions received on your comments
}

export function computeBadges(input: BadgeInputs): Badge[] {
  const volume: Badge[] = VOLUME_TIERS.map((t) => ({
    ...t,
    category: "volume" as const,
    description: `Rate ${t.target.toLocaleString()} film${t.target === 1 ? "" : "s"}.`,
    earned: input.ratedCount >= t.target,
    progress: input.ratedCount,
  }));

  const taste: Badge[] = [
    {
      id: "taste-auteur",
      category: "taste",
      name: "Auteur",
      icon: "🎭",
      description: `Rate ${AUTEUR_TARGET}+ films by Tarkovsky-adjacent auteurs.`,
      target: AUTEUR_TARGET,
      earned: input.auteurCount >= AUTEUR_TARGET,
      progress: input.auteurCount,
    },
    {
      id: "taste-tourist",
      category: "taste",
      name: "Genre Tourist",
      icon: "🧭",
      description: `Rate ${GENRE_TOURIST_TARGET}+ different genres within a single month.`,
      target: GENRE_TOURIST_TARGET,
      earned: input.maxGenresInMonth >= GENRE_TOURIST_TARGET,
      progress: input.maxGenresInMonth,
    },
  ];

  const social: Badge[] = SOCIAL_TIERS.map((t) => ({
    ...t,
    category: "social" as const,
    description: `Get ${t.target} reaction${t.target === 1 ? "" : "s"} on your comments.`,
    earned: input.commentLikes >= t.target,
    progress: input.commentLikes,
  }));

  return [...volume, ...taste, ...social];
}

// ── Auteur detection ──────────────────────────────────────────────────────────

// A curated set of "Tarkovsky-adjacent" auteurs — the arthouse/slow-cinema and
// canonical master directors. Matched case- and accent-insensitively against
// movies.director via substring so "Andrei Tarkovsky" matches "tarkovsky".
export const AUTEUR_KEYS = [
  "tarkovsky",
  "ingmar bergman",
  "akira kurosawa",
  "stanley kubrick",
  "robert bresson",
  "michelangelo antonioni",
  "federico fellini",
  "michael haneke",
  "kieslowski",
  "ozu",
  "bela tarr",
  "terrence malick",
  "david lynch",
  "zvyagintsev",
  "carl theodor dreyer",
  "chantal akerman",
  "abbas kiarostami",
  "angelopoulos",
  "jean-luc godard",
  "agnes varda",
  "wong kar-wai",
  "apichatpong",
  "lars von trier",
  "paul thomas anderson",
  "kore-eda",
  "jim jarmusch",
  "wim wenders",
  "werner herzog",
  "fassbinder",
  "satyajit ray",
  "andrei rublev",
];

function normalizeName(s: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) so "Kieślowski" matches
  // the ASCII key "kieslowski".
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isAuteur(director: string | null | undefined): boolean {
  if (!director) return false;
  const n = normalizeName(director);
  return AUTEUR_KEYS.some((k) => n.includes(k));
}

// ── Aggregations used to feed computeBadges ────────────────────────────────────

export function countAuteurFilms(data: RatingDatum[]): number {
  let n = 0;
  for (const d of data) if (isAuteur(d.director)) n += 1;
  return n;
}

/** Most distinct genres the user rated within any single calendar month. */
export function maxDistinctGenresInAMonth(data: RatingDatum[]): number {
  const byMonth = new Map<string, Set<string>>();
  for (const d of data) {
    const month = d.ratedAt.slice(0, 7); // "YYYY-MM"
    const set = byMonth.get(month) ?? new Set<string>();
    for (const g of d.genres) set.add(g);
    byMonth.set(month, set);
  }
  let max = 0;
  for (const set of byMonth.values()) max = Math.max(max, set.size);
  return max;
}

export function parseGenres(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}
