import {
  MovieCardSkeleton,
  MovieDiaryRowSkeleton,
} from "@/components/Skeletons";

export default function Loading() {
  return (
    <main>
      <section className="movie-hero">
        <div className="movie-hero-inner">
          <div
            className="sk"
            style={{ width: 110, height: 32, borderRadius: 999 }}
          />
          <div className="movie-hero-body">
            <div className="detail-poster">
              <div
                className="sk"
                style={{ width: "100%", aspectRatio: "2 / 3", borderRadius: 14 }}
              />
            </div>
            <div
              className="detail-info"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="sk" style={{ width: "70%", height: 40 }} />
              <div className="sk" style={{ width: "45%", height: 16 }} />
              <div className="sk" style={{ width: "55%", height: 16 }} />
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="cast-watch-row">
          <div className="cast-watch-main">
            <div className="sk" style={{ height: 80, borderRadius: 10 }} />
            <div className="sk" style={{ height: 22, width: 80, marginTop: 8 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
                maxWidth: 520,
                marginTop: 8,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="sk-card">
                  <div className="sk sk-poster" />
                  <div className="sk sk-line" />
                </div>
              ))}
            </div>
          </div>
          <aside
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div className="sk" style={{ height: 140, borderRadius: 12 }} />
            <div className="sk" style={{ height: 56, borderRadius: 12 }} />
            <div className="sk" style={{ height: 180, borderRadius: 12 }} />
          </aside>
        </div>

        <div className="sk" style={{ width: 200, height: 26, margin: "1.5rem 0 0.75rem" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <MovieDiaryRowSkeleton key={i} />
          ))}
        </div>

        <div className="sk" style={{ width: 280, height: 26, margin: "2rem 0 0.75rem" }} />
        <div className="grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
