import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-deduped current-user lookup.
 *
 * `supabase.auth.getUser()` is a network round-trip to the Supabase auth
 * server (it validates the JWT, it doesn't just decode the cookie). Several
 * places in a single page render need the user, and naively each one made its
 * own round-trip — e.g. the movie page called it inline *and* again inside
 * getRatedIds().
 *
 * React's `cache()` memoises per-request: the first caller does the round-trip,
 * every other caller in the same render reuses the resolved promise. The cache
 * is scoped to one request, so there's no cross-user leakage.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Request-deduped current-user *id* lookup, verified locally.
 *
 * Where a caller only needs to know *who* is acting (not the full User
 * object), `getClaims()` is the faster choice: it verifies the JWT signature
 * against the cached JWKS endpoint, so there's no network round-trip to the
 * auth server when the project uses asymmetric signing keys. On legacy
 * symmetric keys it falls back to a network call, so it's never slower than
 * getUser().
 *
 * Safe for write actions: the RLS policies (auth.uid() = user_id) remain the
 * real authorization guard — this only reads the already-signed user id out of
 * the verified token to scope the write.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});
