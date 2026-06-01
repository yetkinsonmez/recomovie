import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (route handlers use the anon client and need no session refresh;
     *   the ⌘K typeahead hits /api/search on every keystroke, so skipping the
     *   auth-server round-trip here keeps it fast)
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, image files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
