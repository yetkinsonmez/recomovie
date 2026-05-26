export default function Loading() {
  return (
    <main className="profile-stage">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />

      <div className="profile-inner" aria-hidden="true">
        <section className="profile-header">
          <div
            className="sk"
            style={{ width: 120, height: 120, borderRadius: "50%" }}
          />
          <div
            className="profile-meta"
            style={{ flex: 1, maxWidth: 320 }}
          >
            <div className="sk" style={{ height: 32, width: "70%" }} />
            <div className="sk" style={{ height: 14, width: "55%" }} />
          </div>
        </section>

        <section className="profile-section">
          <div
            className="sk"
            style={{ height: 38, width: 230, marginBottom: 8 }}
          />
          <div
            className="sk"
            style={{ height: 14, width: 320, marginBottom: 20 }}
          />
          <div className="fav-slots">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="sk"
                style={{ aspectRatio: "2 / 3", borderRadius: 10 }}
              />
            ))}
          </div>
        </section>

        <section className="profile-section">
          <div
            className="sk"
            style={{ height: 38, width: 140, marginBottom: 8 }}
          />
          <div
            className="sk"
            style={{ height: 14, width: 280, marginBottom: 20 }}
          />
          <div className="diary-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="diary-row"
                style={{ borderColor: "transparent" }}
              >
                <div
                  className="sk"
                  style={{ width: 48, height: 72, borderRadius: 4 }}
                />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div className="sk" style={{ height: 16, width: "60%" }} />
                  <div className="sk" style={{ height: 14, width: 120 }} />
                  <div className="sk" style={{ height: 12, width: "45%" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
