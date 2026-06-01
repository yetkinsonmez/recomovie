import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

/** Best-effort client IP from the standard proxy headers. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window, per-IP rate limit backed by the `check_rate_limit` RPC.
 * Returns true if the request is allowed, false if the caller is over budget.
 *
 * Fails OPEN: if the limiter errors (RPC/network), we allow the request rather
 * than block legitimate users on infra hiccups. The goal is abuse mitigation,
 * not hard enforcement.
 */
export async function rateLimit(
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const ip = await clientIp();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: `${action}:${ip}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}
