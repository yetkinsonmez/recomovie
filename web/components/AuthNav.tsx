import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";
import { avatarSrc } from "@/lib/avatars";

export async function AuthNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className="nav-link">
          Sign in
        </Link>
        <Link href="/signup" className="nav-link nav-link-cta">
          Sign up
        </Link>
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_id")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Link href="/profile" className="nav-profile" title="Edit your profile">
        <Image
          src={avatarSrc(profile?.avatar_id)}
          alt=""
          width={28}
          height={28}
          className="nav-avatar"
        />
        <span className="nav-user">
          {profile?.username ? `@${profile.username}` : user.email}
        </span>
      </Link>
      {profile?.username && (
        <Link
          href={`/u/${profile.username}`}
          className="nav-link"
          title="View your public profile"
        >
          Public view
        </Link>
      )}
      <form action={signout}>
        <button type="submit" className="nav-link nav-link-button">
          Sign out
        </button>
      </form>
    </>
  );
}
