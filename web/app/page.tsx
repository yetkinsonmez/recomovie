import { VibeSearch } from "@/components/VibeSearch";
import { VibeResults } from "@/components/VibeResults";

export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string }>;
}) {
  const sp = await searchParams;
  const mood = (sp.mood ?? "").trim();

  if (mood) {
    return (
      <main className="container">
        <VibeSearch compact />
        <VibeResults mood={mood} />
      </main>
    );
  }

  return (
    <main className="landing">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />
      <div className="landing-inner">
        <p className="landing-eyebrow">✦ Theme-matched movie discovery</p>
        <h1 className="landing-title">
          What do you feel like
          <br />
          <span className="landing-grad">watching tonight?</span>
        </h1>
        <p className="landing-sub">
          Describe a mood, a plot, a vibe — recomovie finds the film that fits
          the feeling, not just the genre.
        </p>
        <VibeSearch />
      </div>
    </main>
  );
}
