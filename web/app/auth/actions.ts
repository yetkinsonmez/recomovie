"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Resolve a login identifier (either an email or a username) to an email,
 * because Supabase Auth signs in by email/phone only.
 */
async function resolveEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string,
): Promise<string | null> {
  if (identifier.includes("@")) return identifier;
  const { data, error } = await supabase.rpc("email_for_username", {
    p_username: identifier,
  });
  if (error || !data) return null;
  return data as string;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Where to send the user after a successful sign-in. Only accept relative
  // paths to prevent open-redirect attacks.
  const rawNext = String(formData.get("next") ?? "");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const email = await resolveEmail(supabase, identifier);
  if (!email) {
    redirect(`/login?error=${encodeURIComponent("No account found")}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Username must be 3–20 chars: letters, numbers, underscore",
      )}`,
    );
  }

  // Pre-check username availability so we fail before creating the auth user.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) {
    redirect(
      `/signup?error=${encodeURIComponent("That username is taken")}`,
    );
  }

  // Username goes through signup metadata; the on_auth_user_created trigger
  // reads it from raw_user_meta_data and writes it into profiles. That works
  // even when email confirmation is required and the user isn't signed in
  // yet.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Check your email to confirm your account");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
