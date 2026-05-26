import Link from "next/link";

/**
 * Inline lock card shown in place of content that requires an authenticated
 * viewer. The `next` param wires up "sign in, then come back here".
 */
export function SignInGate({
  label,
  nextPath,
}: {
  label: string;
  nextPath?: string;
}) {
  const search = nextPath
    ? `?message=${encodeURIComponent(`Sign in to ${label.toLowerCase()}`)}&next=${encodeURIComponent(nextPath)}`
    : "";
  return (
    <div className="signin-gate" role="status">
      <span className="signin-gate-icon" aria-hidden="true">🔒</span>
      <div className="signin-gate-body">
        <p className="signin-gate-title">{label}</p>
        <p className="signin-gate-sub">You need to be signed in to see this.</p>
      </div>
      <Link href={`/login${search}`} className="signin-gate-cta">
        Sign in
      </Link>
    </div>
  );
}
