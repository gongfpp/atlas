import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, told about the one font size that is not a `text-*` step:
 * `type-reading` (globals.css). Without it, `cn("text-xs", "type-reading")`
 * would keep both and let stylesheet order pick, instead of the last one
 * winning as it does for every other size.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": ["type-reading"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
