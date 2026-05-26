import Link from "next/link";
import { login } from "@/app/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-card-head">
          <div className="auth-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to keep your diary and watchlist in sync.</p>
        </div>

        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <form action={login} className="auth-form">
          {next && <input type="hidden" name="next" value={next} />}

          <label className="auth-label" htmlFor="identifier">
            Email or username
            <span className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              </span>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                className="auth-input has-icon"
              />
            </span>
          </label>

          <label className="auth-label" htmlFor="password">
            Password
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>

          <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>

        <p className="auth-footer">
          No account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
