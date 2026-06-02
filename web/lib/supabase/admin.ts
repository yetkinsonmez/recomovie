import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS and can call privileged RPCs that
 * are no longer exposed to anon/authenticated (e.g. email_for_username).
 *
 * SERVER ONLY. The key is read from SUPABASE_SERVICE_ROLE_KEY — a non-public
 * env var, so it is never bundled into client JS. Never import this module
 * from a Client Component or anything that runs in the browser: only server
 * actions and route handlers may use it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  // No session persistence/refresh — this client is stateless and per-call.
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
