import { MovieCardSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="container">
      <div className="skeleton-grid">
        {Array.from({ length: 18 }).map((_, index) => (
          <MovieCardSkeleton key={index} />
        ))}
      </div>
    </main>
  );
}
