import type { GenreStat } from "@/lib/stats";

// FIFA-style attributes graph for a viewer's taste: a radar comparing the
// user's average rating per genre ("You") against the crowd average over the
// same films ("Crowd"). The gap between the two polygons is the "critic
// personality" — where you run hot or cold versus everyone else.
//
// Pure server component: it just renders SVG from the precomputed stats.

const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_R = 90;
// Extra room around the radar so axis labels (e.g. "Sci-Fi") sit fully inside
// the SVG box instead of spilling out of the card.
const PAD_X = 56;
const PAD_Y = 16;

// Long TMDB genre names shortened so they fit on the radar axes.
const GENRE_ABBR: Record<string, string> = {
  "Science Fiction": "Sci-Fi",
  Documentary: "Docs",
  "TV Movie": "TV",
};
function shortGenre(g: string): string {
  return GENRE_ABBR[g] ?? g;
}
// Ratings cluster in the upper half of the 0–10 scale, so anchor the radar at
// a floor of 2 to give the shapes room to breathe (purely visual).
const SCALE_MIN = 2;
const SCALE_MAX = 10;

function radius(value: number): number {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, value));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * MAX_R;
}

function point(value: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const r = radius(value);
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function labelPoint(index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const r = MAX_R + 16;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
    angle,
  };
}

function polygon(values: number[]): string {
  return values
    .map((v, i) => {
      const p = point(v, i, values.length);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

// "+0.4" / "−0.6" with a real minus sign.
function fmtDelta(d: number): string {
  if (d > 0) return `+${d.toFixed(1)}`;
  if (d < 0) return `−${Math.abs(d).toFixed(1)}`;
  return "±0.0";
}

function deltaClass(d: number): string {
  if (d >= 0.15) return "critic-delta is-hot";
  if (d <= -0.15) return "critic-delta is-cold";
  return "critic-delta is-neutral";
}

// One-liner personality summary from the most extreme genres. `subject` is the
// noun ("You" / "@alice") and `isOwner` drives verb agreement.
function summary(
  stats: GenreStat[],
  subject: string,
  isOwner: boolean,
): string | null {
  if (stats.length === 0) return null;
  const hottest = [...stats].sort((a, b) => b.delta - a.delta)[0];
  const coldest = [...stats].sort((a, b) => a.delta - b.delta)[0];
  const parts: string[] = [];
  if (hottest.delta >= 0.15) {
    parts.push(`+${hottest.delta.toFixed(1)} on ${hottest.genre.toLowerCase()}`);
  }
  if (coldest.delta <= -0.15 && coldest.genre !== hottest.genre) {
    parts.push(
      `−${Math.abs(coldest.delta).toFixed(1)} on ${coldest.genre.toLowerCase()}`,
    );
  }
  if (parts.length === 0) {
    return `${subject} ${isOwner ? "rate" : "rates"} right in line with the crowd.`;
  }
  const verb = isOwner ? "are" : "is";
  return `${subject} ${verb} ${parts.join(", ")}.`;
}

export function CriticProfile({
  stats,
  name,
}: {
  stats: GenreStat[];
  /** Whose profile this is, for copy. Omit for the owner ("You"). */
  name?: string;
}) {
  const who = name ? `@${name}` : "You";

  if (stats.length < 3) {
    return (
      <p className="meta critic-empty">
        {name ? `@${name} hasn't` : "You haven't"} rated enough films yet — rate
        a few more across different genres to unlock {name ? "their" : "your"}{" "}
        critic personality.
      </p>
    );
  }

  const youValues = stats.map((s) => s.youAvg);
  const crowdValues = stats.map((s) => s.crowdAvg);
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    polygon(stats.map(() => SCALE_MIN + f * (SCALE_MAX - SCALE_MIN))),
  );
  const line = summary(stats, who, !name);

  return (
    <div className="critic-card">
      <div className="critic-radar">
        <svg
          viewBox={`${-PAD_X} ${-PAD_Y} ${SIZE + PAD_X * 2} ${SIZE + PAD_Y * 2}`}
          role="img"
          aria-label={`Rating tendencies by genre for ${who}`}
        >
          {/* grid rings */}
          {rings.map((pts, i) => (
            <polygon key={`ring-${i}`} className="critic-ring" points={pts} />
          ))}
          {/* spokes */}
          {stats.map((s, i) => {
            const p = point(SCALE_MAX, i, stats.length);
            return (
              <line
                key={`spoke-${s.genre}`}
                className="critic-spoke"
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
              />
            );
          })}
          {/* crowd polygon (behind) */}
          <polygon className="critic-poly-crowd" points={polygon(crowdValues)} />
          {/* you polygon (front) */}
          <polygon className="critic-poly-you" points={polygon(youValues)} />
          {/* you vertices */}
          {youValues.map((v, i) => {
            const p = point(v, i, youValues.length);
            return (
              <circle
                key={`dot-${i}`}
                className="critic-dot"
                cx={p.x}
                cy={p.y}
                r={3}
              />
            );
          })}
          {/* axis labels */}
          {stats.map((s, i) => {
            const lp = labelPoint(i, stats.length);
            const anchor =
              Math.abs(lp.x - CENTER) < 12
                ? "middle"
                : lp.x > CENTER
                  ? "start"
                  : "end";
            return (
              <text
                key={`label-${s.genre}`}
                className="critic-axis-label"
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {shortGenre(s.genre)}
              </text>
            );
          })}
        </svg>

        <div className="critic-legend">
          <span className="critic-legend-item">
            <span className="critic-swatch is-you" /> {who}
          </span>
          <span className="critic-legend-item">
            <span className="critic-swatch is-crowd" /> Crowd
          </span>
        </div>
      </div>

      <div className="critic-detail">
        {line && <p className="critic-summary">{line}</p>}
        <ul className="critic-delta-list">
          {[...stats]
            .sort((a, b) => b.delta - a.delta)
            .map((s) => (
              <li key={s.genre} className="critic-delta-row">
                <span className="critic-delta-genre">{s.genre}</span>
                <span className="critic-delta-meta">
                  you {s.youAvg.toFixed(1)} · crowd {s.crowdAvg.toFixed(1)}
                </span>
                <span className={deltaClass(s.delta)}>{fmtDelta(s.delta)}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
