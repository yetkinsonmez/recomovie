"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Shared header navigation shell. On desktop the children render inline; below
// the mobile breakpoint they collapse behind a hamburger toggle into a
// dropdown panel. The static links, AuthNav and ThemeToggle are passed in as
// children so this single client component drives the nav on every page.
export function HeaderNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes (a link was followed).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`nav-toggle${open ? " is-open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
      </button>

      {open && (
        <button
          type="button"
          className="nav-scrim"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}

      <nav id="site-nav" className={`site-nav${open ? " is-open" : ""}`}>
        {children}
      </nav>
    </>
  );
}
