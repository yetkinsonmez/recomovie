import { unstable_cache } from "next/cache";

const MODEL_ID = "mixedbread-ai/mxbai-embed-large-v1";
const API_URL = "https://api.mixedbread.com/v1/embeddings";
// Bounds a genuinely-hung request without cutting off slow-but-healthy calls.
// Kept generous because round-trips from some hosts (e.g. WSL) run several
// seconds even when the API is fine.
const TIMEOUT_MS = 15000;
// Embeddings are deterministic for a given model + text, so a hit can live a
// long time. 30 days keeps popular moods ("feel good movie") off the paid API.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

/** The actual paid call to Mixedbread, with a hard timeout. */
async function fetchEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.MIXEDBREAD_API_KEY;
  if (!apiKey) {
    throw new Error("MIXEDBREAD_API_KEY is not set in web/.env.local");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        input: [text],
        normalized: true,
        encoding_format: "float",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Mixedbread API ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as {
      data: { embedding: number[] }[];
    };
    return json.data[0].embedding;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embed a free-text query into a 1024-dim vector matching the movie
 * embeddings. Normalizes the query (trim + collapse whitespace + lowercase)
 * so trivially-different phrasings share a cache entry, then memoizes the
 * result so repeat/popular moods never re-hit the paid API.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  const cached = unstable_cache(
    () => fetchEmbedding(normalized),
    ["vibe-embed", normalized],
    { revalidate: CACHE_TTL_SECONDS, tags: ["vibe-embed"] },
  );
  return cached();
}
