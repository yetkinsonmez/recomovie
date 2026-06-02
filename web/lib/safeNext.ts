/**
 * Sanitize a post-auth `next` redirect target to a safe, same-origin relative
 * path. Returns "/" for anything that could escape the current origin.
 *
 * Blocks the classics:
 *   - absolute URLs      ("https://evil.com")
 *   - protocol-relative  ("//evil.com")
 *   - backslash tricks   ("/\evil.com") — browsers and the WHATWG URL parser
 *                        fold "\" → "/", so this would resolve to "//evil.com"
 *   - control chars / embedded creds, via the URL-origin re-check below.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";

  // Must be a single-slash absolute path. Reject protocol-relative and any
  // backslash up front (browsers normalize "\" to "/").
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/";
  }

  // Defense in depth: resolve against a throwaway origin and confirm it stayed
  // put. Returns the normalized path so only path+query+hash survive.
  try {
    const u = new URL(raw, "http://localhost");
    if (u.origin !== "http://localhost") return "/";
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return "/";
  }
}
