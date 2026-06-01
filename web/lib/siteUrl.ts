/**
 * Canonical, absolute origin for the site (no trailing slash). Used by the
 * sitemap, robots, metadataBase and JSON-LD so crawlers get fully-qualified
 * URLs.
 *
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://recomovie.app). Falls
 * back to the Vercel-provided deployment URL, then localhost for dev.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel exposes the deployment host without a protocol.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
