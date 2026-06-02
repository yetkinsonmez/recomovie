import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

/**
 * Best-effort client IP for rate-limiting.
 *
 * The LEFT-most `x-forwarded-for` entry is client-supplied and trivially
 * spoofable (a caller prepends whatever they like; the proxy appends the real
 * hop after it), so trusting it lets an attacker rotate the header to dodge a
 * per-IP cap. Prefer headers our trusted proxy sets itself:
 *   1. `x-real-ip`        — Vercel sets this to the true client IP.
 *   2. right-most XFF hop — the address the trusted proxy actually observed.
 * Falling back to the right-most (not left-most) XFF keeps us safe behind a
 * single proxy even if `x-real-ip` is absent.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();

  const real = h.get("x-real-ip");
  if (real?.trim()) return real.trim();

  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const hops = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}

/**
 * Fixed-window rate limit for a fully-formed bucket key, backed by the
 * `check_rate_limit` RPC. Returns true if allowed, false if over budget.
 *
 * Takes the key directly (no `headers()` call), so it's safe to run from
 * contexts where the request scope isn't available — e.g. inside the
 * `unstable_cache` miss path, where we only want to charge budget for real
 * API spend. Resolve the IP with `clientIp()` in request scope first.
 *
 * Fails OPEN: if the limiter errors (RPC/network), we allow the request rather
 * than block legitimate users on infra hiccups.
 */
export async function rateLimitKey(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

/**
 * Fixed-window, per-IP rate limit. Resolves the caller's IP from the request
 * headers and delegates to {@link rateLimitKey}. The goal is abuse mitigation,
 * not hard enforcement.
 */
export async function rateLimit(
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const ip = await clientIp();
  return rateLimitKey(`${action}:${ip}`, limit, windowSeconds);
}
