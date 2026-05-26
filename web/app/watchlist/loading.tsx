export default function Loading() {
  return (
    <main className="container watchlist-page">
      <header className="catalog-hero">
        <span className="catalog-hero-orb catalog-hero-orb-1" aria-hidden="true" />
        <span className="catalog-hero-orb catalog-hero-orb-2" aria-hidden="true" />
        <p className="catalog-eyebrow">Personal queue</p>
        <h1>Your watchlist</h1>
        <p>
          Films you want to watch — filter, sort, and let recomovie suggest
          more in the same vein.
        </p>
      </header>

      <section className="catalog-shell" aria-hidden="true">
        {/* Mirror the Controls bar height so layout doesn't jump. */}
        <div className="controls">
          <div className="sk" style={{ flex: 1, height: 48, borderRadius: 10 }} />
          <div className="sk" style={{ width: 180, height: 48, borderRadius: 10 }} />
          <div className="sk" style={{ width: 180, height: 48, borderRadius: 10 }} />
        </div>
        <div className="sk" style={{ width: 200, height: 18, margin: "1rem 0" }} />
        <section className="grid catalog-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="sk"
              style={{ aspectRatio: "2 / 3", borderRadius: 12 }}
            />
          ))}
        </section>
      </section>

      <section className="wl-suggest-section" aria-hidden="true">
        <header className="wl-suggest-header">
          <div>
            <p className="catalog-eyebrow">For you</p>
            <h2 className="wl-suggest-title-h">
              <span className="landing-grad">More like your watchlist</span>
            </h2>
          </div>
        </header>
        <div className="wl-suggest-strip">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="wl-suggest-card">
              <div
                className="sk"
                style={{ aspectRatio: "2 / 3", borderRadius: 8 }}
              />
              <div className="sk" style={{ height: 14, width: "80%" }} />
              <div className="sk" style={{ height: 12, width: "40%" }} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
