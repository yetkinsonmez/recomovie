"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/auth/actions";
import { ThemeToggle } from "./ThemeToggle";

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function WatchlistIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="user-menu-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function UserMenu({
  label,
  avatar,
}: {
  label: string;
  avatar: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Close when the route changes (a menu link was followed).
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className={`user-menu-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        <Image src={avatar} alt="" width={28} height={28} className="nav-avatar" />
        <span className="nav-user">{label}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <Link href="/profile" className="user-menu-item" role="menuitem">
            <ProfileIcon />
            <span>Profile</span>
          </Link>
          <Link href="/watchlist" className="user-menu-item" role="menuitem">
            <WatchlistIcon />
            <span>Watchlist</span>
          </Link>

          <div className="user-menu-sep" role="separator" />

          <div className="user-menu-row">
            <span>Theme</span>
            <ThemeToggle />
          </div>

          <div className="user-menu-sep" role="separator" />

          <form action={signout}>
            <button type="submit" className="user-menu-item user-menu-danger" role="menuitem">
              <SignOutIcon />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
