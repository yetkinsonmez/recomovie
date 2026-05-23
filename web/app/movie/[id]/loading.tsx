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
        <div
          className="sk"
          style={{ width: 240, height: 26, marginBottom: 22 }}
        />
        <div className="grid">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="sk"
              style={{ aspectRatio: "2 / 3", borderRadius: 12 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
