import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

/** Best-effort client IP from the standard proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
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
