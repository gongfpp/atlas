import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A scroll region whose top and bottom edges dissolve — but only on a side
 * where there is more to scroll to (Atlas Standards' `ScrollFade`).
 *
 * Scrollbars are hidden across the app, so this is what tells you a region
 * scrolls. It IS the scroll container, not an overlay: it measures its own
 * `scrollTop` against `fade` and writes two registered custom properties that
 * the `scroll-fade` mask reads. Registered (`@property` in globals.css), so
 * the edges TRANSITION rather than snap — a fade that pops in on the first
 * pixel of scroll reads as a glitch, one that eases in reads as depth.
 *
 * Unlike Standards' copy it writes the two properties straight onto the
 * element instead of through state, so scrolling a long list costs no React
 * render at all.
 */
const ScrollFade = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    /** How far, in px, an edge dissolves over. */
    fade?: number;
  }
>(function ScrollFade({ className, fade = 28, onScroll, style, children, ...props }, forwarded) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const top = max <= 2 ? 0 : Math.min(1, el.scrollTop / fade) * fade;
    const bottom = max <= 2 ? 0 : Math.min(1, (max - el.scrollTop) / fade) * fade;
    el.style.setProperty("--fade-top", `${top}px`);
    el.style.setProperty("--fade-bottom", `${bottom}px`);
  }, [fade]);

  React.useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // The children too: content growing under a fixed-height region changes
    // whether there is anything below.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, children]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        if (typeof forwarded === "function") forwarded(el);
        else if (forwarded) forwarded.current = el;
      }}
      data-slot="scroll-fade"
      onScroll={(e) => {
        measure();
        onScroll?.(e);
      }}
      className={cn("scroll-fade overflow-y-auto", className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

export { ScrollFade };
