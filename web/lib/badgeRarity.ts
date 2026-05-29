import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  AUTEUR_KEYS,
  AUTEUR_TARGET,
  GENRE_TOURIST_TARGET,
  SOCIAL_TARGETS,
  VOLUME_TARGETS,
} from "@/lib/stats";

// badge id -> % of active users who have earned it (0–100).
export type BadgeRarityMap = Record<string, number>;

interface RarityRow {
  kind: string;
  threshold: number;
  earned: number;
}

// Map an RPC (kind, threshold) pair back to the badge id used in stats.ts.
function badgeIdFor(kind: string, threshold: number): string | null {
  switch (kind) {
    case "volume":
      return `vol-${threshold}`;
    case "social":
      return `soc-${threshold}`;
    case "auteur":
      return "taste-auteur";
    case "genre_tourist":
      return "taste-tourist";
    default:
      return null;
  }
}

// Global, identical for every viewer and slow-moving — so it's fetched with the
// public anon client and cached for an hour rather than recomputed per profile
// view. (unstable_cache can't touch request cookies, hence the anon client.)
export const getBadgeRarities = unstable_cache(
  async (): Promise<BadgeRarityMap> => {
    const { data, error } = await supabase.rpc("get_badge_rarities", {
      p_auteur_keys: AUTEUR_KEYS,
      p_auteur_target: AUTEUR_TARGET,
      p_genre_target: GENRE_TOURIST_TARGET,
      p_volume_targets: VOLUME_TARGETS,
      p_social_targets: SOCIAL_TARGETS,
    });
    if (error || !data) return {};

    const rows = data as RarityRow[];
    const total = Number(
      rows.find((r) => r.kind === "__total__")?.earned ?? 0,
    );
    if (total <= 0) return {};

    const map: BadgeRarityMap = {};
    for (const r of rows) {
      if (r.kind === "__total__") continue;
      const id = badgeIdFor(r.kind, Number(r.threshold));
      if (id) map[id] = (Number(r.earned) / total) * 100;
    }
    return map;
  },
  ["badge-rarities-v1"],
  { revalidate: 3600 },
);
