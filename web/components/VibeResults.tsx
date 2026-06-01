import { supabase } from "@/lib/supabase";
import { embedQuery } from "@/lib/embed";
import { clientIp, rateLimitKey } from "@/lib/rateLimit";
import { VibeResultsExplorer } from "@/components/VibeResultsExplorer";
import type { Recommendation } from "@/lib/types";

const MATCH_COUNT = 180;
const MIN_SIMILARITY = 0.5;
// Per-IP cap on the paid embedding call. Generous for a human exploring moods,
// tight enough to stop a script from running up the bill.
const RATE_LIMIT = 15;
const RATE_WINDOW_SECONDS = 60;

// Thrown from the cache-miss hook when the caller is over their embedding
// budget, so we can tell it apart from a genuine embed/search failure.
class RateLimitedError extends Error {}

export async function VibeResults({ mood }: { mood: string }) {
  let results: Recommendation[] = [];
  let failed = false;

  // Resolve the IP in request scope (headers aren't available inside the cache
  // below). The limit is only charged on a cache miss — a real paid call — so
  // exploring already-cached moods never burns budget.
  const ip = await clientIp();

  try {
    const vector = await embedQuery(mood, async () => {
      const allowed = await rateLimitKey(
        `vibe:${ip}`,
        RATE_LIMIT,
        RATE_WINDOW_SECONDS,
      );
      if (!allowed) throw new RateLimitedError();
    });
    const { data, error } = await supabase.rpc("match_movies_by_embedding", {
      query_embedding: JSON.stringify(vector),
      match_count: MATCH_COUNT,
    });
    if (error) {
      console.error("[vibe] rpc error:", error);
      failed = true;
    } else {
      results = ((data ?? []) as Recommendation[]).filter(
        (movie) => movie.similarity >= MIN_SIMILARITY,
      );
    }
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return (
        <section>
          <p className="error">
            You’re searching a little fast — give it a few seconds and try
            again.
          </p>
        </section>
      );
    }
    const reason = err instanceof Error ? err.message || err.name : String(err);
    console.error("[vibe] embed/search failed:", reason);
    failed = true;
  }

  return (
    <section>
      {failed ? (
        <p className="error">
          Couldn’t run the vibe search just now — please try again in a moment.
        </p>
      ) : results.length === 0 ? (
        <p className="empty">No matches — try describing it a different way.</p>
      ) : (
        <VibeResultsExplorer mood={mood} results={results} />
      )}
    </section>
  );
}
