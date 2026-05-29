import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Manrope, Instrument_Serif } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { ViewTransitions } from "next-view-transitions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthNav } from "@/components/AuthNav";
import { HeaderNav } from "@/components/HeaderNav";
import "./globals.css";

// Body font: humanist sans, refined and readable.
const bodyFont = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Display font: theatrical serif with a beautiful italic, matching the
// vintage-cinema feel of the logo. Used for the landing/movie titles,
// section headers, taglines, and the overview drop cap.
const displayFont = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "recomovie — find films by their story",
  description:
    "Movie recommendations matched on plot, theme and tone — not just genre.",
};

// Runs before paint: applies the saved theme (or the OS preference) so there
// is no flash of the wrong theme on load.
const themeScript = `
(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ViewTransitions>
      <html
        lang="en"
        className={`${bodyFont.variable} ${displayFont.variable}`}
        suppressHydrationWarning
      >
        <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <NextTopLoader
          color="#c2543a"
          height={3}
          shadow="0 0 8px #c2543a, 0 0 4px #c2543a"
          showSpinner={false}
        />
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="logo-link">
              <Image
                src="/recomovie-logo.png"
                alt="recomovie"
                width={140}
                height={46}
                priority
              />
            </Link>
            <HeaderNav>
              <Link href="/movies" className="nav-link">
                All movies
              </Link>
              <Link href="/watchlist" className="nav-link">
                Watchlist
              </Link>
              <AuthNav />
              <ThemeToggle />
            </HeaderNav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="tmdb-attribution-logo"
              aria-label="The Movie Database (TMDB)"
            >
              <Image
                src="/tmdb-logo.svg"
                alt="TMDB"
                width={130}
                height={17}
              />
            </a>
            <p className="tmdb-attribution-text">
              This website uses TMDB and the TMDB APIs but is not endorsed,
              certified, or otherwise approved by TMDB.
            </p>
          </div>
        </footer>
        </body>
      </html>
    </ViewTransitions>
  );
}
