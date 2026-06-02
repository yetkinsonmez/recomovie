"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Clamps its content to `collapsedHeight` with a faded bottom edge, and reveals
// the rest with a smooth height animation on toggle. Children are rendered by
// the server (so any censoring stays server-side); this only controls height +
// the fade. If the content already fits, it renders inline with no toggle.
export function Collapsible({
  collapsedHeight,
  showAllLabel = "Show all",
  children,
}: {
  collapsedHeight: number;
  showAllLabel?: string;
  children: React.ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // True once the open animation has finished — lets us drop the height clamp
  // and the fade so later content changes aren't clipped.
  const [revealed, setRevealed] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [collapsible, setCollapsible] = useState(false);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      // scrollHeight reports the full content height even while clamped.
      setFullHeight(el.scrollHeight);
      setCollapsible(el.scrollHeight > collapsedHeight + 24);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [collapsedHeight, children]);

  // Fade stays on through the open animation, then clears when fully revealed.
  const faded = collapsible && !revealed;

  let maxHeight: number | string | undefined;
  if (!collapsible) maxHeight = undefined;
  else if (revealed) maxHeight = "none";
  else if (open) maxHeight = fullHeight;
  else maxHeight = collapsedHeight;

  function toggle() {
    if (open) {
      // Animate from the real (auto) height back down: pin to a pixel height
      // first, then collapse on the next frame so the transition has a start.
      setRevealed(false);
      requestAnimationFrame(() => setOpen(false));
    } else {
      setOpen(true);
    }
  }

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget || e.propertyName !== "max-height") return;
    if (open) setRevealed(true);
  }

  return (
    <div className="collapsible">
      <div
        ref={innerRef}
        className={`collapsible-inner ${faded ? "is-faded" : ""}`}
        style={collapsible ? { maxHeight } : undefined}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
      </div>
      {collapsible && (
        <button
          type="button"
          className="collapsible-toggle"
          onClick={toggle}
          aria-expanded={open}
        >
          {open ? "Show less" : showAllLabel}
          <svg
            className="collapsible-chevron"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
