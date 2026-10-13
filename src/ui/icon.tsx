import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one way to render an icon (decision 30).
 *
 * The audit found Lucide sized with a raw `size=` at 903 call sites across six
 * values — 11 (289), 12 (223), 10 (106), 13 (94), 14 (44) and a tail — with ten
 * distinct `strokeWidth`s on top. Two of those sizes are half-steps of the
 * others and exist only because someone nudged a row by a pixel.
 *
 * So there are five sizes, and one default stroke width. When the sweep moves a
 * call site, it maps the old number to the nearest step:
 *
 *     9 → 10 (xs) · 10 → 10 (xs) · 11 → 12 (sm) · 12 → 12 (sm)
 *     13 → 14 (md) · 14 → 14 (md) · 16 → 16 (lg) · 20 → 20 (xl)
 *
 * Deliberately NOT migrated in Foundations: the primitives in `src/ui` use it,
 * and everything else moves in the colour-and-scale sweep.
 *
 * The steps are Atlas Standards' since the design-language sync — one step up
 * from the old 10 / 12 / 14 / 16 / 20, to sit beside the 12px body — and are
 * Tailwind's spacing steps, so they are applied as rem classes and follow the
 * type scale. The numbers are what each step is at the 16px root.
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
} as const;

const ICON_CLASS = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-4.5",
  xl: "size-5.5",
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/** The one stroke width. Lucide's own default is 2, which reads heavy at 10–14px. */
export const ICON_STROKE_WIDTH = 1.75;

export interface IconProps extends Omit<LucideProps, "size" | "ref"> {
  /** The Lucide component, passed as a value: `<Icon icon={Search} />`. */
  icon: LucideIcon;
  size?: IconSize;
}

export function Icon({
  icon: Glyph,
  size = "md",
  strokeWidth = ICON_STROKE_WIDTH,
  className,
  ...props
}: IconProps) {
  return (
    <Glyph
      data-slot="icon"
      size={undefined}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", ICON_CLASS[size], className)}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}
