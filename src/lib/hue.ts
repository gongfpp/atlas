/**
 * The eight identity hues (Atlas Standards' `lib/hue.ts`).
 *
 * A hue is an IDENTITY, not a status: `purple` means "the Design label", not
 * "informational". Each reads through a `--atlas-hue-*` theme key, so a tone
 * keeps its meaning across themes even though its numbers change. Status is
 * the four `success / warning / error / info` tokens, never one of these.
 */

export type Hue = "grey" | "indigo" | "purple" | "cyan" | "green" | "amber" | "orange" | "red";

export const HUES: readonly Hue[] = [
  "grey",
  "indigo",
  "purple",
  "cyan",
  "green",
  "amber",
  "orange",
  "red",
];

/** The `.tag-<hue>` utility for each hue (globals.css). */
export const TAG_CLASS: Record<Hue, string> = {
  grey: "tag-grey",
  indigo: "tag-indigo",
  purple: "tag-purple",
  cyan: "tag-cyan",
  green: "tag-green",
  amber: "tag-amber",
  orange: "tag-orange",
  red: "tag-red",
};

/**
 * A stable hue for an arbitrary key, so the same entity keeps its colour
 * forever — a project is the same hue on every screen, in every session,
 * without anyone assigning it. The same hash as Standards, so a project is
 * the same hue on the desktop, the web and the phone.
 */
export function hueFor(key: string): Hue {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length]!;
}
