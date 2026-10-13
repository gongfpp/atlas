// One timing for every tooltip in the app — the Radix `Tooltip`/`Hint`, the
// sliding `HintGroup`, and the titlebar dock. The first tooltip waits
// TOOLTIP_OPEN_DELAY so a pointer crossing the UI doesn't flash labels; once
// one has been open, the next opens instantly (and without an entrance) until
// TOOLTIP_WARM_WINDOW has passed with nothing open. The warm state is shared
// module state, so moving from one kind of tooltip to another stays instant.

import type { Transition } from "motion/react";
import { SPRING_INDICATOR } from "@/lib/motion";

export const TOOLTIP_OPEN_DELAY = 300;
export const TOOLTIP_WARM_WINDOW = 300;

/** Strong ease-out: starts moving at once, settles without overshoot. The
 *  CSS `--ease-out-strong`, in the array form `motion` takes. */
export const TOOLTIP_EASE = [0.23, 1, 0.32, 1] as const;
export const TOOLTIP_FADE_IN_MS = 125;
export const TOOLTIP_FADE_OUT_MS = 80;

let openCount = 0;
let warmUntil = 0;

/** Call when a tooltip becomes visible. */
export function markTooltipOpen() {
  openCount += 1;
}

/** Call when a tooltip that was visible hides. */
export function markTooltipClosed() {
  openCount = Math.max(0, openCount - 1);
  warmUntil = Date.now() + TOOLTIP_WARM_WINDOW;
}

/** True while a tooltip is open or one closed within the warm window. */
export function isTooltipWarm() {
  return openCount > 0 || Date.now() < warmUntil;
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * The sliding strip's `motion` transition. Opacity always eases; position and
 * clip only travel when asked — the first reveal must appear in place rather
 * than fly in from wherever the last hover left the strip — and travel rides
 * the same spring as every other indicator that slides between options.
 *
 * Reduced motion keeps the fade and drops the travel. `MotionConfig` already
 * stops `x` from animating under it, but `clipPath` is not a transform and
 * would still sweep, so the check stays here.
 */
export function slideTransition({ visible, travel }: { visible: boolean; travel: boolean }): {
  opacity: Transition;
  x: Transition;
  clipPath: Transition;
} {
  const move = travel && !prefersReducedMotion() ? SPRING_INDICATOR : { duration: 0 };
  return {
    opacity: visible
      ? { duration: TOOLTIP_FADE_IN_MS / 1000, ease: TOOLTIP_EASE }
      : { duration: TOOLTIP_FADE_OUT_MS / 1000, ease: "easeOut" },
    x: move,
    clipPath: move,
  };
}

/** Test hook: forget any open/warm state between tests. */
export function resetTooltipTiming() {
  openCount = 0;
  warmUntil = 0;
}
