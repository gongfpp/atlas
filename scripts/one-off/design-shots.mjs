// Screenshot the key surfaces on the browser mock backend, for the
// design-language sync (plans/design-language-sync.md, Phase 0.1).
//
//   bunx vite --port 5199 --strictPort      # in another shell
//   node scripts/one-off/design-shots.mjs <label> [surface…]
//
// Writes target/design-shots/<label>/<surface>-<appearance>.png. Run once as
// `baseline`, then after each slice under a new label and compare.
//
// The clock is pinned (SHOT_TIME), so relative times — "3h ago" — read the same
// on every run rather than ticking over an hour between a baseline and a check.
//
// Tabs are opened by importing the app's own store modules through Vite: the
// dev server hands back the same module instance the app is using, so
// `useLayoutStore.getState()` here is the app's store. Animations are frozen
// so a staggered entrance is never caught half-way.
//
// playwright-core is not an Atlas dependency. It resolves from
// PLAYWRIGHT_CORE (a path to the package), defaulting to the copy in the
// sibling `standards` checkout.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const pw = require(
  process.env.PLAYWRIGHT_CORE ?? join(homedir(), "Desktop/standards/node_modules/playwright-core"),
);

const BASE = process.env.ATLAS_URL ?? "http://localhost:5199";
const SHOT_TIME = new Date(process.env.SHOT_TIME ?? "2026-10-13T12:00:00Z");
const label = process.argv[2] ?? "baseline";
const only = new Set(process.argv.slice(3));
const out = resolve("target/design-shots", label);
mkdirSync(out, { recursive: true });

const tab = (type, title, data = {}, extra = {}) => ({ tab: { type, title, data }, ...extra });

/** Each surface: a tab to open (or none, for the bare shell), then optionally
 *  a row to click (`click`, Playwright text) or a store call (`comms`). */
const SURFACES = {
  shell: null,
  chat: tab("chat", "Agents"),
  timeline: tab("artifacts", "Timeline"),
  "timeline-session": tab("artifacts", "Timeline", {}, { click: "text=Move the user reads onto" }),
  settings: tab("settings", "Settings", { section: "general" }),
  "settings-appearance": tab("settings", "Settings", { section: "appearance" }),
  usage: tab("usage", "Usage"),
  memory: tab("memory", "Memory"),
  knowledge: tab("knowledge", "Knowledge"),
  terminal: tab("terminal", "Terminal"),
  log: tab("log", "Log"),
  canvas: tab("canvas", "Spaces"),
  comms: { tab: null, comms: true },
};

const FREEZE = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}`;

const browser = await pw.chromium.launch({ headless: true });
let failures = 0;

for (const [name, spec] of Object.entries(SURFACES)) {
  if (only.size && !only.has(name)) continue;
  for (const appearance of ["dark", "light"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      colorScheme: appearance,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.clock.setFixedTime(SHOT_TIME);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: FREEZE });
    await page.evaluate(async (mode) => {
      const { useThemeStore } = await import("/src/features/theme/stores/theme-store.ts");
      await useThemeStore.getState().actions.apply("atlas", mode);
    }, appearance);
    if (spec?.tab) {
      await page.evaluate(async (t) => {
        const { useLayoutStore } = await import("/src/features/layout/stores/layout-store.ts");
        useLayoutStore.getState().actions.addTab({
          id: `${t.type}-shot`,
          closable: true,
          dirty: false,
          ...t,
        });
      }, spec.tab);
    }
    if (spec?.comms) {
      await page.evaluate(async () => {
        const { useLayoutStore } = await import("/src/features/layout/stores/layout-store.ts");
        useLayoutStore.getState().actions.toggleRightPanelMode("chat");
      });
    }
    if (spec?.click) {
      await page.waitForTimeout(800);
      await page.locator(`${spec.click} >> visible=true`).first().click();
    }
    await page.waitForTimeout(1500);
    const file = join(out, `${name}-${appearance}.png`);
    await page.screenshot({ path: file });
    if (errors.length) {
      failures++;
      console.log(`✗ ${name}-${appearance}\n  ${errors.join("\n  ")}`);
    } else {
      console.log(`✓ ${name}-${appearance}`);
    }
    await page.close();
  }
}

await browser.close();
console.log(`→ ${out}`);
process.exit(failures ? 1 : 0);
