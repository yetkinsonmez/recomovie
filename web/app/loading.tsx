export default function Loading() {
  return (
    <main className="container">
      <div className="skeleton-grid">
        {Array.from({ length: 18 }).map((_, index) => (
          <div key={index} className="skeleton-card" aria-hidden="true" />
        ))}
      </div>
    </main>
  );
}
