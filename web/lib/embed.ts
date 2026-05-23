const MODEL_ID = "mixedbread-ai/mxbai-embed-large-v1";
const API_URL = "https://api.mixedbread.com/v1/embeddings";

/** Embed a free-text query into a 1024-dim vector matching the movie embeddings. */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.MIXEDBREAD_API_KEY;
  if (!apiKey) {
    throw new Error("MIXEDBREAD_API_KEY is not set in web/.env.local");
  }

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
  });

  if (!res.ok) {
    throw new Error(`Mixedbread API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data: { embedding: number[] }[];
  };
  return json.data[0].embedding;
}
