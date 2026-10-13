// The sliding tooltip's strip: one row holding every label of a row of
// controls, translated so the active label centres under its control and
// clipped so only that label shows. Moving `x` and the clip together is what
// makes one box appear to travel and resize between items instead of one
// tooltip fading out and another fading in. The arithmetic is
// `slide-geometry.ts`; the timing is `tooltip-timing.ts`. Shared by the
// titlebar dock and `HintGroup`, which differ only in how they position and
// mount it.

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { KbdCombo } from "@/ui/kbd";
import type { SlideGeometry } from "@/ui/slide-geometry";
import { slideTransition } from "@/ui/tooltip-timing";

export function SlideStrip({
  labels,
  geometry,
  visible,
  travel,
  labelRef,
}: {
  /** `shortcut` is a combo string, drawn as keycaps after the label. */
  labels: { key: string; label: string; shortcut?: string }[];
  geometry: SlideGeometry | null;
  visible: boolean;
  /** False for a first reveal, which appears in place. */
  travel: boolean;
  labelRef: (key: string, el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      data-slot="slide-strip"
      className={cn(
        "flex w-max",
        "bg-popover text-foreground",
        "outline outline-1 outline-border",
        // The menu step, like every other popover in `src/ui`.
        "shadow-md",
      )}
      // Mount at rest: the strip is invisible until hovered, and a first
      // reveal must not animate in from the origin.
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        x: geometry?.tx ?? 0,
        clipPath: `inset(0 ${geometry?.right ?? 0}% 0 ${geometry?.left ?? 0}% round 6px)`,
      }}
      transition={slideTransition({ visible, travel })}
    >
      {labels.map(({ key, label, shortcut }) => (
        <div
          key={key}
          ref={(el) => labelRef(key, el)}
          className="flex h-[22px] shrink-0 items-center whitespace-nowrap px-2.5 text-2xs leading-none"
        >
          {label}
          {shortcut && <KbdCombo combo={shortcut} size="2xs" className="ml-2" />}
        </div>
      ))}
    </motion.div>
  );
}
