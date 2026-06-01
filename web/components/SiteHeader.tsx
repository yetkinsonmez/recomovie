"use client";

import { useEffect, useState } from "react";

// Sticky header that condenses once the page scrolls — smaller padding, a
// shrunk logo and a stronger blur/shadow. Wraps the server-rendered logo + nav
// as children, so it stays a thin client shell.
export function SiteHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-inner">{children}</div>
    </header>
  );
}
