//! Global interface zoom (⌘+ / ⌘- / ⌘0).
//!
//! Uses the native WebView zoom — the same thing browser ⌘±/⌘0 drives — so it
//! scales the ENTIRE UI (text + layout), not just `rem`-based sizes. Root
//! font-size scaling wouldn't work because the app uses px-based utilities
//! (`text-2xs`, `h-[32px]`) everywhere.
//!
//! The factor is persisted as `AppSettings.uiScale` (Rust `state.json`) and
//! re-applied on boot via the project store's `hydrate`.

import { getCurrentWebview } from "@tauri-apps/api/webview";

/** Atlas Standards' range. The density is the design system's; the scale is
 *  how big the reader wants it, and outside 0.9–1.4 layouts stop holding.
 *  Rust's `validate` keeps wider bounds so an older saved value still loads;
 *  `clampScale` brings it inside on the next apply. */
export const MIN_SCALE = 0.9;
export const MAX_SCALE = 1.4;
export const SCALE_STEP = 0.1;
export const DEFAULT_SCALE = 1;

/** The named steps the interface-scale popover offers. The stepper and the
 *  zoom shortcuts still move on the `SCALE_STEP` grid; a preset is just a
 *  shortcut to a size worth naming. */
export const SCALE_PRESETS = [
  { value: 0.9, label: "Compact" },
  { value: 1, label: "Default" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Larger" },
] as const;

/** Round to a clean grid and clamp into [MIN_SCALE, MAX_SCALE]. */
export function clampScale(scale: number): number {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  // Avoid float drift (0.1 + 0.2 …) accumulating across repeated ⌘+ presses.
  return Math.round(clamped * 100) / 100;
}

/** Apply the interface zoom via the native WebView. */
export function applyUiScale(scale: number): void {
  void getCurrentWebview()
    .setZoom(clampScale(scale))
    .catch((e) => console.warn("setZoom failed:", e));
}
