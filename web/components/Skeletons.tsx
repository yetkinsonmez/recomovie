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
