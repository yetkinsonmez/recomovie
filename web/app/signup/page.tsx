import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        {error && <p className="auth-error">{error}</p>}
        <form action={signup} className="auth-form">
          <label className="auth-label">
            Username
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]{3,20}"
              title="3–20 chars, letters, numbers, underscore"
              autoComplete="username"
              className="auth-input"
            />
          </label>
          <label className="auth-label">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="auth-input"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="auth-input"
            />
          </label>
          <SubmitButton pendingLabel="Creating account…">Sign up</SubmitButton>
        </form>
        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
