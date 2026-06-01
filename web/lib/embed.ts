import { unstable_cache } from "next/cache";

const MODEL_ID = "mixedbread-ai/mxbai-embed-large-v1";
const API_URL = "https://api.mixedbread.com/v1/embeddings";
// Per-attempt timeout. Generous enough for a slow-but-healthy call (round-trips
// from some hosts, e.g. WSL, run several seconds), but short enough that a stuck
// request fails fast so we can retry rather than hang for 15s and give up.
const ATTEMPT_TIMEOUT_MS = 9000;
// One retry: an intermittent timeout/blip/cold-start usually succeeds on a
// second, now-warm attempt. (4xx responses aren't retried — they won't fix.)
const MAX_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 400;
// Embeddings are deterministic for a given model + text, so a hit can live a
// long time. 30 days keeps popular moods ("feel good movie") off the paid API.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

// A 4xx (bad key/request) won't succeed on retry; a timeout, network error, or
// 5xx/429 is transient and worth another go.
function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "AbortError") return true; // our per-attempt timeout
    if ("retryable" in err) {
      return (err as { retryable?: boolean }).retryable === true;
    }
    return true; // network/other transient failure (e.g. "fetch failed")
  }
  return true;
}

/** A single Mixedbread call, aborted if it exceeds the per-attempt timeout. */
async function fetchEmbeddingOnce(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
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
      const body = await res.text().catch(() => "");
      const err = new Error(`Mixedbread API ${res.status}: ${body}`);
      // Retry server errors and rate limits; not client errors.
      (err as { retryable?: boolean }).retryable =
        res.status >= 500 || res.status === 429;
      throw err;
    }

    const json = (await res.json()) as {
      data: { embedding: number[] }[];
    };
    return json.data[0].embedding;
  } finally {
    clearTimeout(timer);
  }
}

/** The paid call to Mixedbread, with a per-attempt timeout and one retry. */
async function fetchEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.MIXEDBREAD_API_KEY;
  if (!apiKey) {
    throw new Error("MIXEDBREAD_API_KEY is not set in web/.env.local");
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchEmbeddingOnce(text, apiKey);
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) break;
      const reason = err instanceof Error ? err.message || err.name : String(err);
      console.warn(`[vibe] embed attempt ${attempt} failed (${reason}); retrying`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    }
  }
  throw lastErr ?? new Error("Embedding request failed");
}

/**
 * Embed a free-text query into a 1024-dim vector matching the movie
 * embeddings. Normalizes the query (trim + collapse whitespace + lowercase)
 * so trivially-different phrasings share a cache entry, then memoizes the
 * result so repeat/popular moods never re-hit the paid API.
 *
 * `onCacheMiss` runs only when the value isn't cached — i.e. immediately before
 * the paid API call. This lets the caller enforce a rate limit on real spend
 * without charging budget for free cache hits. It must not use request-scoped
 * APIs (headers/cookies) since it runs inside unstable_cache; resolve those in
 * request scope and close over the result. Throwing from it aborts the fetch
 * and caches nothing.
 */
export async function embedQuery(
  text: string,
  onCacheMiss?: () => Promise<void>,
): Promise<number[]> {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  const cached = unstable_cache(
    async () => {
      if (onCacheMiss) await onCacheMiss();
      return fetchEmbedding(normalized);
    },
    ["vibe-embed", normalized],
    { revalidate: CACHE_TTL_SECONDS, tags: ["vibe-embed"] },
  );
  return cached();
}
