/**
 * The motion vocabulary, as constants `motion` takes directly. Copied from
 * Atlas Standards (`src/lib/motion.ts` there), the design system the desktop,
 * web and mobile apps share — change a number there first, then here.
 *
 * Four springs, one ease, one stagger. They are what make the chrome feel like
 * one object rather than a set of components that each picked a curve, so a
 * component imports one of these instead of writing its own stiffness.
 *
 *   SPRING_RAIL       a sidebar changing width
 *   SPRING_DOCK       the dock opening beside the page
 *   SPRING_INDICATOR  a segmented thumb or an underline sliding between options
 *   SPRING_PILL       a rail's active row sliding between destinations
 *   EASE_PANEL        a panel entering; the CSS `--ease-panel` in array form
 *
 * What goes where: anything that moves on a spring, animates layout
 * (`layout` / `layoutId`) or enters and leaves (`AnimatePresence`) uses
 * `motion`. Hover and state colour transitions, Base UI's `data-open`
 * keyframes and the button-to-panel morph stay CSS, as they do in Standards.
 * Reduced motion is honoured once, by the `MotionConfig` in `main.tsx`.
 */

export const SPRING_RAIL = { type: "spring", stiffness: 420, damping: 40 } as const;
export const SPRING_DOCK = { type: "spring", stiffness: 380, damping: 40 } as const;
export const SPRING_INDICATOR = { type: "spring", stiffness: 520, damping: 38 } as const;
export const SPRING_PILL = { type: "spring", stiffness: 560, damping: 42 } as const;

export const EASE_PANEL = [0.22, 1, 0.36, 1] as const;

/** Panels stagger down a page at these delays (seconds). Index by position. */
export const PANEL_STAGGER = [0, 0.05, 0.1, 0.15, 0.2, 0.25] as const;

export const PANEL_ENTER = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
} as const;
