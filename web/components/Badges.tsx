import type { Badge, BadgeCategory } from "@/lib/stats";

// Steam-style badge case. Badges are grouped into Volume / Taste / Social and,
// within each group, ranked by how close the user is to earning them (earned
// first, then nearest-to-unlock). The single closest locked badge across all
// groups is flagged as "up next". Each badge also shows its rarity — the % of
// active users who have earned it. Pure server component.

const GROUPS: { category: BadgeCategory; title: string; blurb: string }[] = [
  { category: "volume", title: "Volume", blurb: "Films rated" },
  { category: "taste", title: "Taste", blurb: "What you watch" },
  { category: "social", title: "Social", blurb: "Reactions on your comments" },
];

// 0–1 completion toward a badge (earned counts as fully complete).
function ratio(b: Badge): number {
  if (b.earned) return 1;
  return Math.max(0, Math.min(1, b.progress / b.target));
}

// Rank: earned first, then locked by descending closeness, then smaller target.
function byCloseness(a: Badge, b: Badge): number {
  if (a.earned !== b.earned) return a.earned ? -1 : 1;
  const d = ratio(b) - ratio(a);
  if (Math.abs(d) > 1e-9) return d;
  return a.target - b.target;
}

function progressLabel(b: Badge): string {
  if (b.earned) return "Unlocked";
  const cur = Math.min(b.progress, b.target);
  return `${cur.toLocaleString()} / ${b.target.toLocaleString()}`;
}

// Steam-style rarity tiers, driven by the % of active users who own the badge.
function rarityTier(pct: number): { cls: string; label: string } {
  if (pct < 5) return { cls: "is-legendary", label: "Legendary" };
  if (pct < 20) return { cls: "is-rare", label: "Rare" };
  if (pct < 50) return { cls: "is-uncommon", label: "Uncommon" };
  return { cls: "is-common", label: "Common" };
}

function rarityPct(pct: number): string {
  // One decimal under 10% so ultra-rare badges don't all collapse to "0%".
  return pct < 10 ? pct.toFixed(1) : Math.round(pct).toString();
}

export function Badges({ badges }: { badges: Badge[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;

  // The single closest locked badge anywhere — highlighted as "up next".
  const nextBadge = badges
    .filter((b) => !b.earned)
    .sort((a, b) => ratio(b) - ratio(a) || a.target - b.target)[0];

  return (
    <div className="badges">
      <p className="badges-count meta">
        {earnedCount} of {badges.length} unlocked
      </p>
      {GROUPS.map((group) => {
        const items = badges
          .filter((b) => b.category === group.category)
          .sort(byCloseness);
        if (items.length === 0) return null;
        return (
          <div key={group.category} className="badge-group">
            <div className="badge-group-head">
              <h3 className="badge-group-title">{group.title}</h3>
              <span className="badge-group-blurb meta">{group.blurb}</span>
            </div>
            <ul className="badge-grid">
              {items.map((b) => {
                const pct = Math.round(ratio(b) * 100);
                const isNext = b.id === nextBadge?.id;
                const cls = b.earned
                  ? "badge-card is-earned"
                  : `badge-card is-locked${isNext ? " is-next" : ""}`;
                const tier =
                  b.rarity != null ? rarityTier(b.rarity) : null;
                return (
                  <li key={b.id} className={cls} title={b.description}>
                    <span className="badge-icon" aria-hidden="true">
                      {b.icon}
                    </span>
                    <span className="badge-body">
                      <span className="badge-name-row">
                        <span className="badge-name">{b.name}</span>
                        {!b.earned && <span className="badge-pct">{pct}%</span>}
                      </span>
                      <span className="badge-desc">{b.description}</span>
                      {!b.earned && (
                        <span className="badge-progress">
                          <span
                            className="badge-progress-bar"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      )}
                      <span className="badge-foot">
                        <span className="badge-status">
                          {isNext && !b.earned ? `Up next · ` : ""}
                          {progressLabel(b)}
                        </span>
                        {tier && (
                          <span
                            className={`badge-rarity ${tier.cls}`}
                            title={`${tier.label} — ${rarityPct(b.rarity!)}% of critics have earned this`}
                          >
                            {tier.label} · {rarityPct(b.rarity!)}%
                          </span>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
