import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc } from "@/lib/avatars";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function SignUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    // Signed-out: the theme toggle lives here (the avatar menu, its home for
    // signed-in users, doesn't exist when logged out).
    return (
      <>
        <Link href="/login" className="nav-link nav-link-icon">
          <SignInIcon />
          <span>Sign in</span>
        </Link>
        <Link href="/signup" className="nav-link nav-link-cta nav-link-icon">
          <SignUpIcon />
          <span>Sign up</span>
        </Link>
        <ThemeToggle />
      </>
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_id")
    .eq("id", user.id)
    .single();

  const label = profile?.username ? `@${profile.username}` : (user.email ?? "Account");

  return <UserMenu label={label} avatar={avatarSrc(profile?.avatar_id)} />;
}
