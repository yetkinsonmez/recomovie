// Reusable skeleton building blocks. The .sk class provides the shimmer;
// these compositions mirror the real components' shape so swap-in is
// visually stable.

export function MovieCardSkeleton() {
  return (
    <div className="sk-card" aria-hidden="true">
      <div className="sk sk-poster" />
      <div className="sk sk-line" />
      <div className="sk sk-line short" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <section className="grid catalog-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </section>
  );
}

// Matches the Hot This Week section (HomeFeedSection): an eyebrow/title block
// plus the tight 6-up grid. Used as the Suspense fallback for the home feed so
// only the data-driven region streams — the hero + search render instantly.
export function HomeFeedSkeleton() {
  return (
    <div className="container home-feed" aria-hidden="true">
      <section className="home-feed-section">
        <header className="home-feed-head">
          <div className="sk sk-line" style={{ width: 170, height: 26 }} />
          <div
            className="sk sk-line"
            style={{ width: 210, height: 14, marginTop: 10 }}
          />
        </header>
        <div className="grid home-feed-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function DiaryRowSkeleton() {
  return (
    <div className="sk-diary-row" aria-hidden="true">
      <div className="sk sk-poster" />
      <div className="sk-body">
        <div className="sk sk-line" style={{ width: "60%" }} />
        <div className="sk sk-line" style={{ width: 120 }} />
        <div className="sk sk-line" style={{ width: "45%" }} />
      </div>
    </div>
  );
}

export function VibeResultsSkeleton({ mood }: { mood?: string }) {
  return (
    <section className="vibe-results-shell" aria-hidden="true">
      <span className="vibe-results-orb vibe-results-orb-1" />
      <span className="vibe-results-orb vibe-results-orb-2" />
      <div className="vibe-results-head">
        <div>
          <p className="result-kicker">Matched to your vibe</p>
          {mood ? (
            <h1 className="result-title">“{mood}”</h1>
          ) : (
            <div className="sk sk-line" style={{ width: 260, height: 28 }} />
          )}
        </div>
      </div>
      <MovieGridSkeleton count={12} />
    </section>
  );
}

export function MovieDiaryRowSkeleton() {
  return (
    <div className="sk-movie-diary" aria-hidden="true">
      <div className="sk-head">
        <div className="sk sk-avatar" />
        <div className="sk sk-line" style={{ width: 120 }} />
        <div className="sk sk-line" style={{ width: 80, marginLeft: "auto" }} />
      </div>
      <div className="sk sk-line" style={{ width: "90%" }} />
      <div className="sk sk-line" style={{ width: "70%" }} />
    </div>
  );
}
