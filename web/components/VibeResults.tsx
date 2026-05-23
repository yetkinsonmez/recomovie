import { supabase } from "@/lib/supabase";
import { embedQuery } from "@/lib/embed";
import { VibeResultsExplorer } from "@/components/VibeResultsExplorer";
import type { Recommendation } from "@/lib/types";

const MATCH_COUNT = 180;
const MIN_SIMILARITY = 0.5;

export async function VibeResults({ mood }: { mood: string }) {
  let results: Recommendation[] = [];
  let failed = false;

  try {
    const vector = await embedQuery(mood);
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
    console.error("[vibe] embed/search failed:", err);
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
