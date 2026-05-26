// Re-export the View Transitions-aware Link from next-view-transitions.
// Drop-in replacement for next/link that wraps navigation in
// document.startViewTransition and waits for Next's router to commit
// before the browser snapshots the new page.
export { Link as VTLink } from "next-view-transitions";
