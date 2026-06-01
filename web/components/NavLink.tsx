"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A nav link that knows when its section is the active route and gets an
// animated underline. `href` matches exactly or as a path prefix (so /movies
// also lights up on /movies?genre=… etc.).
export function NavLink({
  href,
  children,
  className = "nav-link",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`${className}${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
