import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) redirects back here with a `code`. We exchange it for a
// session (PKCE — the verifier cookie was set when the flow started), then send
// the user on. First-time social sign-ins have no username yet, so we route
// them to /profile to pick one; returning users go where they intended.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow relative redirects — guards against open-redirect via ?next=.
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Behind Vercel's proxy the request origin is the internal host; use the
  // forwarded host for the user-facing redirect in production.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();
        const dest = profile?.username ? next : "/profile";
        return NextResponse.redirect(new URL(dest, base));
      }
      return NextResponse.redirect(new URL(next, base));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Could%20not%20sign%20in%20with%20Google", base),
  );
}
