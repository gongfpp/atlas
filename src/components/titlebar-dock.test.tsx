// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { MotionGlobalConfig } from "motion/react";

import { SPRING_INDICATOR } from "@/lib/motion";
import {
  resetTooltipTiming,
  slideTransition,
  TOOLTIP_OPEN_DELAY,
  TOOLTIP_WARM_WINDOW,
} from "@/ui/tooltip-timing";
import { TitlebarDock, type DockItem } from "./titlebar-dock";

// Watched, not replaced: the strip still gets the real transition.
vi.mock("@/ui/tooltip-timing", async (actual) => {
  const real = await actual<typeof import("@/ui/tooltip-timing")>();
  return { ...real, slideTransition: vi.fn(real.slideTransition) };
});

/**
 * happy-dom reports every rect as zero, and the whole tooltip is arithmetic
 * over rects — so each element gets a measured box here. Labels are given
 * distinct widths so a loop that sums the wrong range is visible in the result
 * rather than cancelling out.
 */
function measure(el: Element, box: { left: number; width: number }) {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ ...box, right: box.left + box.width, top: 0, bottom: 22, height: 22 }),
  });
}

const items: DockItem[] = [
  { label: "Check for updates", icon: <i />, onClick: vi.fn() },
  { label: "Notifications", icon: <i />, onClick: vi.fn() },
  { label: "Hide right panel", icon: <i />, onClick: vi.fn() },
];

/**
 * Lay the dock out: labels 40/60/80 (total 180) on an anchor starting at 100.
 *
 * The anchor is measured, NOT the strip. That distinction is the bug this
 * suite exists to hold: the strip is the element being translated, so reading
 * its rect as the origin folds the previous offset into the next one and every
 * hover drifts further. The anchor here is given a FIXED rect while the strip
 * deliberately gets none, so any code that measures the strip reads zeros and
 * fails loudly.
 */
function layout(container: HTMLElement, iconCentres = [120, 200, 280]) {
  const strip = container.querySelector("[style*='clip-path']") as HTMLElement;
  measure(strip.parentElement!, { left: 100, width: 180 });
  const labels = [...strip.children];
  [40, 60, 80].forEach((width, i) => measure(labels[i], { left: 0, width }));
  const buttons = [...container.querySelectorAll("button")];
  buttons.forEach((b, i) => measure(b, { left: iconCentres[i] - 12, width: 24 }));
  return { strip, buttons };
}

const translateX = (el: HTMLElement) =>
  Number(/translateX\(([-\d.]+)px\)/.exec(el.style.transform)![1]);
const insets = (el: HTMLElement) => {
  const m = /inset\(0 ([\d.]+)% 0 ([\d.]+)%/.exec(el.style.clipPath)!;
  return { right: Number(m[1]), left: Number(m[2]) };
};

/**
 * The strip is a `motion.div`, and `motion` steps its animations on the
 * `requestAnimationFrame` it captured at import — before any test fakes the
 * clock — so fake timers never reach it. Real time does: `settle` waits two
 * frames' worth of it. Taken now, while `setTimeout` is still the real one.
 *
 * Animations are instant unless a test says otherwise, so after `settle` the
 * strip shows where it is going rather than somewhere on the way.
 */
const realSetTimeout = globalThis.setTimeout;
const settle = async () => {
  for (let i = 0; i < 2; i++) {
    // Zero-delay fake timers too: motion hands some of its work to one.
    act(() => vi.advanceTimersByTime(0));
    await act(async () => {
      await new Promise((done) => realSetTimeout(done, 20));
    });
  }
};

beforeEach(() => {
  vi.useFakeTimers();
  resetTooltipTiming();
  MotionGlobalConfig.instantAnimations = true;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  MotionGlobalConfig.instantAnimations = false;
});

/** Hover, wait out the shared open delay, and let the strip arrive. */
async function hover(el: Element) {
  fireEvent.mouseEnter(el);
  act(() => vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY));
  await settle();
}

describe("TitlebarDock", () => {
  it("renders one button per item, named for the tooltip", async () => {
    render(<TitlebarDock items={items} />);
    expect(screen.getByLabelText("Notifications")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("invokes the item's action on click", async () => {
    render(<TitlebarDock items={items} />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(items[1].onClick).toHaveBeenCalledTimes(1);
  });

  it("is invisible until something is hovered", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const strip = container.querySelector("[style*='clip-path']") as HTMLElement;
    expect(strip.style.opacity).toBe("0");
  });

  it("clips away every label but the hovered one", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);

    await hover(buttons[1]);
    // 40 of 180 to the left, 80 of 180 to the right.
    expect(insets(strip)).toEqual({ left: (40 / 180) * 100, right: (80 / 180) * 100 });
    expect(strip.style.opacity).toBe("1");
  });

  it("shows the first label with nothing clipped on its left", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);
    await hover(buttons[0]);
    expect(insets(strip)).toEqual({ left: 0, right: ((60 + 80) / 180) * 100 });
  });

  it("centres the hovered label on its icon", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);

    await hover(buttons[1]);
    // strip left 100 + 40 before + half of 60 = 170; icon centre 200.
    expect(translateX(strip)).toBe(30);
  });

  it("pulls the tooltip back inside the window at the right edge", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    // Last icon near the edge: its 80px label would otherwise overhang.
    const { strip, buttons } = layout(container, [120, 200, window.innerWidth - 10]);

    await hover(buttons[2]);
    const centre = window.innerWidth - 10;
    const unclamped = centre - (100 + 40 + 60 + 40);
    const overflow = centre + 40 - (window.innerWidth - 8);
    expect(translateX(strip)).toBe(unclamped - overflow);
    // Which is to say: its right edge lands exactly on the margin.
    expect(100 + 100 + translateX(strip) + 80).toBe(window.innerWidth - 8);
  });

  it("materialises in place on first hover, then travels between items", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { buttons } = layout(container);
    const lastAsk = () => vi.mocked(slideTransition).mock.lastCall?.[0];

    await hover(buttons[0]);
    // Nothing to travel from yet: travelling here would fly the tooltip in
    // from the origin.
    expect(lastAsk()).toEqual({ visible: true, travel: false });

    fireEvent.mouseEnter(buttons[1]);
    expect(lastAsk()).toEqual({ visible: true, travel: true });
  });

  it("fades out without moving, so the next hover travels from here", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);
    await hover(buttons[1]);
    const held = strip.style.transform;

    fireEvent.mouseLeave(container.firstElementChild as HTMLElement);
    act(() => vi.advanceTimersByTime(200));
    await settle();
    expect(strip.style.opacity).toBe("0");
    expect(strip.style.transform).toBe(held);
  });

  it("stays silent when nothing can be measured", async () => {
    // The zero-rect case: a hidden titlebar, or a hover before layout. Better
    // to show no tooltip than one stacked at the origin.
    const { container } = render(<TitlebarDock items={items} />);
    const strip = container.querySelector("[style*='clip-path']") as HTMLElement;
    await hover(screen.getAllByRole("button")[1]);
    expect(strip.style.opacity).toBe("0");
  });

  it("hosts a trailing control and gives it a tooltip of its own", async () => {
    const { container } = render(
      <TitlebarDock
        items={items}
        trailing={{ label: "Account", node: <button aria-label="Account" /> }}
      />,
    );
    const strip = container.querySelector("[style*='clip-path']") as HTMLElement;
    measure(strip.parentElement!, { left: 100, width: 230 });
    // Four labels now: the trailing one is part of the strip's arithmetic.
    const labels = [...strip.children];
    expect(labels).toHaveLength(4);
    [40, 60, 80, 50].forEach((width, i) => measure(labels[i], { left: 0, width }));

    // The account's wrapper carries the hover, since the button belongs to
    // whoever rendered it (Radix attaches its trigger to the real element).
    const wrapper = screen.getByLabelText("Account").parentElement as HTMLElement;
    measure(wrapper, { left: 300, width: 20 });
    await hover(wrapper);

    expect(insets(strip)).toEqual({ left: ((40 + 60 + 80) / 230) * 100, right: 0 });
    expect(strip.style.opacity).toBe("1");
  });

  it("marks a disabled item and does not fire it", async () => {
    const onClick = vi.fn();
    render(<TitlebarDock items={[{ label: "Checking…", icon: <i />, onClick, disabled: true }]} />);
    const button = screen.getByLabelText("Checking…") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("waits for the open delay before the first label", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);
    fireEvent.mouseEnter(buttons[0]);
    await settle();
    expect(strip.style.opacity).toBe("0");
    act(() => vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY - 1));
    await settle();
    expect(strip.style.opacity).toBe("0");
    act(() => vi.advanceTimersByTime(1));
    await settle();
    expect(strip.style.opacity).toBe("1");
  });

  it("does not open if the pointer leaves during the delay", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);
    fireEvent.mouseEnter(buttons[0]);
    fireEvent.mouseLeave(container.firstElementChild as HTMLElement);
    act(() => vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY * 2));
    await settle();
    expect(strip.style.opacity).toBe("0");
  });

  it("opens instantly right after a tooltip closed, then waits again once cold", async () => {
    const { container } = render(<TitlebarDock items={items} />);
    const { strip, buttons } = layout(container);
    const dock = container.firstElementChild as HTMLElement;
    await hover(buttons[0]);
    fireEvent.mouseLeave(dock);

    fireEvent.mouseEnter(buttons[1]);
    await settle();
    expect(strip.style.opacity).toBe("1");
    fireEvent.mouseLeave(dock);

    act(() => vi.advanceTimersByTime(TOOLTIP_WARM_WINDOW + 1));
    fireEvent.mouseEnter(buttons[2]);
    await settle();
    expect(strip.style.opacity).toBe("0");
  });

  it("travels on the shared indicator spring, and only once it is up", () => {
    expect(slideTransition({ visible: true, travel: true }).x).toBe(SPRING_INDICATOR);
    expect(slideTransition({ visible: true, travel: true }).clipPath).toBe(SPRING_INDICATOR);
    // A first reveal: everything but the fade is instant.
    expect(slideTransition({ visible: true, travel: false }).x).toEqual({ duration: 0 });
  });
});

describe("the dock's sliding label strip", () => {
  /**
   * The regression this guards is a whole-app one, and it has no other symptom
   * a test can see.
   *
   * The strip is one `w-max` row holding every label, mounted all the time and
   * clipped to the active label by `clip-path` — a paint effect that leaves the
   * layout box at its full width. Anchored `absolute` to a pill at the right end
   * of the title bar, that box ran a few hundred px past the window, and because
   * `#root` is `overflow: hidden` the browser counted it as scrollable overflow.
   * One `focus()` or `scrollIntoView()` then slid the entire app shell left —
   * Settings' nav clipped, its first column of theme cards off-screen — with no
   * scrollbar to put it back.
   *
   * `fixed` is the fix: a fixed box is laid out against the viewport and never
   * joins an ancestor's scrollable overflow.
   */
  it("is fixed to the viewport, so it never becomes scrollable overflow", () => {
    const { container } = render(
      <TitlebarDock
        items={items}
        trailing={{ label: "Account and settings", node: <button>a</button> }}
      />,
    );
    const anchor = container.querySelector(".pointer-events-none") as HTMLElement;

    expect(anchor).not.toBeNull();
    expect(anchor.className).toContain("fixed");
    expect(anchor.className).not.toContain("absolute");
    // `top: 100%` cannot reach the pill from a viewport-anchored box; the
    // measured value takes its place.
    expect(anchor.className).not.toContain("top-full");
    expect(anchor.style.top).toBe("0px");
  });
});
