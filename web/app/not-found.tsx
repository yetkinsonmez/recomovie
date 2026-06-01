import Link from "next/link";

// A film reel standing in for the "0" of 404 — keeps the vintage-cinema motif.
function FilmReel() {
  return (
    <svg className="errp-reel" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="var(--card)" stroke="currentColor" strokeWidth="6" />
      <circle cx="50" cy="50" r="11" fill="currentColor" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = 28;
        const rad = (deg * Math.PI) / 180;
        return (
          <circle
            key={deg}
            cx={50 + r * Math.cos(rad)}
            cy={50 + r * Math.sin(rad)}
            r="7.5"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="errp">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="errp-inner">
        <p className="errp-eyebrow">✦ Lost reel</p>

        <div className="errp-code">
          <span className="sr-only">404 — page not found</span>
          <span className="landing-grad" aria-hidden="true">4</span>
          <FilmReel />
          <span className="landing-grad" aria-hidden="true">4</span>
        </div>

        <h1 className="errp-title">This scene didn’t make the cut</h1>
        <p className="errp-sub">
          The page or film you’re after isn’t here — it may have been moved, or
          never existed. Let’s get you back to something worth watching.
        </p>

        <div className="errp-actions">
          <Link href="/movies" className="errp-btn errp-btn-primary">
            Browse all movies
          </Link>
          <Link href="/" className="errp-btn errp-btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
