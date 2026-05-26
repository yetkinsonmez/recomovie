import Link from "next/link";
import { login } from "@/app/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
        <form action={login} className="auth-form">
          {next && <input type="hidden" name="next" value={next} />}
          <label className="auth-label">
            Email or username
            <input
              name="identifier"
              type="text"
              required
              autoComplete="username"
              className="auth-input"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="auth-input"
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
