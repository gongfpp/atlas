import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { splitGlyphCombo } from "@/features/keybindings/lib/combo";

/**
 * A keycap (decision 32).
 *
 * shadcn's base-style `Kbd` in shape, moved onto the Foundations scales: the
 * cap is `--control-xs` tall rather than a hand-written 18px, its corner is
 * `rounded` (the control radius) rather than a literal 4px, and its text is
 * `text-3xs`.
 *
 * `KbdKeys` and `KbdCombo` are the two ways the app actually uses it — from a
 * `displayKeys` array, or from a combo string like "⌘⇧F" or "Ctrl+Shift+F".
 *
 * **Every shortcut the app shows is drawn with these, one cap per key** — in a
 * tooltip, a menu, a footer legend or a sentence. Never as text ("⌘K", "Press
 * Ctrl+P") and never as one cap holding a whole combo. `Hint`'s `shortcut`,
 * `HintItem`'s and the menus' `…Shortcut` slots take a combo string and draw
 * it here, so most callers never import this file. `2xs` is the cap that sits
 * inside a line of text; `xs` stands alone in a row; `sm` is for a legend that
 * is the content (the keybindings table, onboarding).
 * `tests/shortcut-keycaps.test.ts` holds the rule.
 */
const kbdVariants = cva(
  [
    "pointer-events-none inline-flex w-fit items-center justify-center gap-1 select-none",
    "rounded border border-border bg-card text-muted-foreground",
    "px-1.5 font-sans leading-none",
    "[&_svg:not([class*='size-'])]:size-3",
  ],
  {
    variants: {
      size: {
        "2xs": "h-4 min-w-4 px-1 text-4xs",
        xs: "h-control-xs min-w-(--control-xs) text-3xs",
        sm: "h-control-sm min-w-(--control-sm) text-2xs",
      },
    },
    defaultVariants: { size: "xs" },
  },
);

export interface KbdProps extends React.ComponentProps<"kbd">, VariantProps<typeof kbdVariants> {}

function Kbd({ className, size, ...props }: KbdProps) {
  return <kbd data-slot="kbd" className={cn(kbdVariants({ size }), className)} {...props} />;
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1 align-middle", className)}
      {...props}
    />
  );
}

type KbdSize = VariantProps<typeof kbdVariants>["size"];

/** Render a list of keycaps (["⌘", "⇧", "B"]) — the form `displayKeys` produces. */
function KbdKeys({
  keys,
  size,
  className,
}: {
  keys: readonly string[];
  size?: KbdSize;
  className?: string;
}) {
  return (
    <KbdGroup className={cn(size === "2xs" && "gap-0.5", className)}>
      {keys.map((k, i) => (
        <Kbd key={`${k}-${i}`} size={size}>
          {k}
        </Kbd>
      ))}
    </KbdGroup>
  );
}

/** Render a combo string ("⌘⇧F", "⌥Space", "Ctrl+Shift+F") as one cap per key.
 *  Every modifier is its own cap; the remainder ("F", "Space") is one cap. */
function KbdCombo({
  combo,
  size,
  className,
}: {
  combo: string;
  size?: KbdSize;
  className?: string;
}) {
  return <KbdKeys keys={splitGlyphCombo(combo)} size={size} className={className} />;
}

/**
 * A picker's footer of keys and what they do — "↑ ↓ navigate · ↵ open · esc
 * close". Each entry is its keycaps followed by its word, so a list never has
 * to spell a key in prose. `keys` is one array per entry, one string per cap.
 */
function KbdLegend({
  items,
  className,
}: {
  items: readonly { keys: readonly string[]; label: string }[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {items.map(({ keys, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <KbdKeys keys={keys} size="2xs" />
          {label}
        </span>
      ))}
    </span>
  );
}

export { Kbd, KbdGroup, KbdKeys, KbdCombo, KbdLegend, kbdVariants };
export type { KbdSize };
