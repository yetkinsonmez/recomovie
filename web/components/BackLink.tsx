"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Smart back button: if the user arrived from somewhere on this site, call
// router.back() so they return to whatever list/filter they had. Otherwise
// (deep link, new tab, external referrer) fall back to a sensible default
// like /movies. The label tracks the actual destination so users know where
// they're going.
export function BackLink({
  fallbackHref = "/movies",
  fallbackLabel = "All movies",
}: {
  fallbackHref?: string;
  fallbackLabel?: string;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // history.length grows with every SPA push (router.push / Link click).
    // 1 = fresh tab or direct URL. >1 = we have somewhere to go back to.
    // We deliberately don't check document.referrer: it doesn't update on
    // client-side route changes, so it'd misreport navigation history.
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (canGoBack) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <a href={fallbackHref} onClick={handleClick} className="back">
      ← {canGoBack ? "Back" : fallbackLabel}
    </a>
  );
}
