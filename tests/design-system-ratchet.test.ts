import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The design-system ratchet (decision 33) — closed at zero.
 *
 * Foundations put the type, radius, elevation, z-index and motion scales in
 * Tailwind namespaces, but the 2026-09-17 audit found the app almost entirely
 * off them: 95% of 1,427 font-size utilities were arbitrary, nearly every
 * floating layer sat at a hand-written 9999–100000, there were 686 colour
 * literals in 141 files, and 56 inline `zIndex` values. None of that compiles
 * differently, so nothing else in the toolchain can see it — a new
 * `text-[11.5px]` type-checks, lints, renders, and is invisible until someone
 * re-reads the file.
 *
 * It ran as a RATCHET through the sweep: committed counts in
 * `design-system-ratchet.baseline.json` that could only go down. **The sweep
 * finished and every count reached zero**, so the baseline is gone and this is
 * now a ban: a new violation fails, full stop.
 *
 * Adopting Atlas Standards, the design system shared with the cloud apps,
 * brought its rules here too. Those already at zero are bans like the rest;
 * the ones with debt still owed carry a `ceiling` instead, and return to being
 * bans as the sync pays them off. That is the old ratchet again, for those
 * rules only.
 *
 * That only works because the exits are real ones. A value that genuinely
 * cannot come from the scale gets `EXEMPT_FILES` (a whole file that DEFINES
 * the scale, or whose colours are not Atlas's to choose) or an inline
 * `ratchet-allow: <reason>` marker at the site. Both demand prose, and both
 * are checked: an exemption with no argument next to it fails the suite too.
 * If you are reaching for one, read what the existing entries argue before
 * adding another — "it has a lot of them" is not one of the arguments.
 *
 * Scope is every folder that renders: `src/features`, `src/components`,
 * `src/ui` and `src/dev`. `src/styles` is the only wholesale exclusion left —
 * it IS the scale, so "use the scale instead" cannot apply to it.
 *
 * `src/ui` and `src/dev` used to be excluded wholesale on the same argument,
 * and the argument was untrue of almost every file in them: the 2026-09-18
 * review found a hardcoded white canvas ink and a literal 50%-black popover
 * shadow hiding in `src/ui`, neither of which defines anything. Of the 19 files
 * in `src/ui` exactly those two carried a violation, so there is no residue to
 * exempt. `src/dev` keeps a narrow exemption for the fixture files whose
 * CONTENT is colours (theme files, fake source listings) — see `EXEMPT_FILES`.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["src/features", "src/components", "src/ui", "src/dev"];

interface Rule {
  id: string;
  /** What to write instead. Printed on failure, so keep it actionable. */
  instead: string;
  pattern: RegExp;
  /**
   * Set only on a rule adopted from Atlas Standards before its debt was paid
   * during the design-language sync. The count may not rise above
   * it, and when it falls the ceiling has to come down with it, so a fix can
   * never be quietly spent again. A rule without one is a ban.
   */
  ceiling?: number;
}

const RULES: Rule[] = [
  {
    id: "arbitrary-text-size",
    instead:
      "text-4xs … text-2xl, or type-reading for 13px (Atlas Standards' scale). Half-pixel sizes round UP.",
    pattern: /\btext-\[-?\d*\.?\d+(?:px|rem|em|pt)\]/g,
  },
  {
    id: "arbitrary-z-index",
    instead:
      "z-panel / z-titlebar / z-overlay / z-modal / z-popover / z-toast / z-tooltip / z-drag (decision 28).",
    pattern: /\bz-\[[^\]]+\]/g,
  },
  {
    id: "arbitrary-shadow",
    instead:
      "shadow-sm (raised) / shadow-md (menus) / shadow-lg (dialogs), plus inset-highlight (decision 27).",
    pattern: /\bshadow-\[[^\]]+\]/g,
  },
  {
    id: "arbitrary-radius",
    instead: "rounded (= sm) / rounded-md / rounded-lg / rounded-xl / rounded-full (decision 26).",
    pattern: /\brounded(?:-(?:t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee))?-\[[^\]]+\]/g,
  },
  {
    id: "colour-literal",
    instead: "a base token or an --atlas-* theme key; see docs/reference/theme-keys.md.",
    pattern: /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g,
  },
  {
    id: "white-black-utility",
    instead:
      "a token: bg-background / bg-card / text-foreground / border-border. White and " +
      "black are not theme-neutral, and `bg-` was never the only way to write one.",
    // Every utility that takes a colour, not just `bg-`. Thirteen sites were
    // using `text-white`, `border-black/20` and friends in plain sight.
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|caret|shadow|accent|from|via|to)-(?:white|black)(?:\/\d+)?\b/g,
  },
  {
    id: "tailwind-palette",
    instead:
      "a status or base token: text-warning / bg-warning-muted / text-success / " +
      "border-error. Tailwind's stock ramps are a second palette no theme can reach.",
    // Tailwind's own named scales. A theme cannot restate `amber-500`, so a
    // config-error banner painted in it stays amber in all sixteen variants.
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|caret|shadow|accent|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|\d{3})(?:\/\d+)?\b/g,
  },
  {
    id: "bare-z-index",
    instead:
      "z-panel / z-titlebar / z-drawer / z-overlay / z-modal / z-popover / z-toast / " +
      "z-tooltip / z-drag (decision 28). Below 50 is local stacking and is fine.",
    // Decision 28 bans ARBITRARY z-index at or above 60, which is a numeric test
    // for a semantic defect: three dialogs shipped at a bare `z-50`, under their
    // own `z-overlay` (100) scrim, and passed it. `z-50` is Tailwind's stock top
    // and is what "float above everything" reaches for, which in a codebase with
    // named layers running to 500 is exactly the wrong instinct.
    pattern: /\bz-(?:[5-9]\d|\d{3,})\b/g,
  },
  {
    id: "inline-numeric-style",
    instead: "a class from the scale; an inline style cannot be swept and cannot be themed.",
    // The `var(` escape hatch has to survive being QUOTED: an inline style in
    // TSX is a string, so `zIndex: "var(--z-popover)"` is the correct fix and
    // the first version of this rule counted it as the violation.
    pattern: /\b(?:zIndex|fontSize|boxShadow)\s*:\s*(?!["'`]?\s*var\()["'`\d]/g,
  },
  {
    id: "arbitrary-var",
    instead:
      "the named utility: text-muted-foreground, bg-element-hover, border-border-strong… " +
      "A colour with no utility gets a `--color-*` line in globals.css; a non-colour " +
      "variable uses Tailwind's shorthand, `origin-(--transform-origin)`.",
    // Atlas Standards' rule. `text-[var(--muted-foreground)]` and
    // `text-muted-foreground` compile to the same CSS, so the escape is a second
    // spelling of every token: 2,929 of them were collapsed on 2026-10-13 with
    // the screenshots byte-identical before and after. One name per pixel.
    pattern: /\[var\(--/g,
  },
  {
    id: "dark-variant",
    instead:
      "a token that already differs per appearance. A `dark:` class is a second " +
      "colour system beside the theme, and it cannot reach a third-party theme's variant.",
    pattern: /\bdark:[a-z[]/g,
  },

  {
    id: "spring-literal",
    instead:
      "a spring from src/lib/motion.ts — SPRING_RAIL / SPRING_DOCK / SPRING_INDICATOR / " +
      "SPRING_PILL. They are Standards' numbers, and one set is what makes the chrome " +
      "move as one object.",
    // The transition's `type`, not `stiffness:` — the graph views' force
    // layouts have a stiffness of their own that is physics, not chrome.
    pattern: /\btype:\s*["'`]spring["'`]/g,
  },

  // ── Adopted from Atlas Standards with debt still owed ──────────────────────
  // Each carries a ceiling instead of being a ban. They reach zero during the
  // design-language sync and then lose the ceiling.
  {
    id: "colour-function",
    instead:
      "a token. A tint of a token is its opacity modifier (`bg-primary/10`); a " +
      "colour that is a role gets a key in keys.toml. Standards keeps `oklch()` " +
      "and `color-mix()` in the token layer only.",
    pattern: /\boklch\(|\bcolor-mix\(/g,
    ceiling: 24,
  },
  {
    id: "raised-shadow",
    instead:
      "a ring: `ring-1 ring-foreground/10` on a lighter surface step. Only what " +
      "floats over content casts — `shadow-md` for menus and popovers, `shadow-lg` " +
      "for dialogs and sheets.",
    pattern: /\bshadow-(?:2?xs|sm|xl|2xl|black|white)(?:\/\d+)?\b/g,
  },
  {
    id: "inline-radius",
    instead: "a `rounded-*` class from the scale.",
    pattern: /\bborderRadius\s*:\s*["'`]?\d/g,
    ceiling: 12,
  },
];

/**
 * Whole files inside the scanned roots that are exempt, each with the reason.
 * `src/ui` and `src/styles` are excluded wholesale because they DEFINE these
 * values; the entries below are in a feature folder for a different reason each
 * time, and the reason is the entry — a path with no argument next to it is not
 * an exemption, it is a number someone gave up on.
 *
 * Two shapes qualify and nothing else does:
 *
 *  1. **The file defines the scale.** "Use a theme key instead" cannot apply to
 *     the table a theme key resolves through.
 *  2. **The colour is not Atlas's to choose.** A third party's brand mark, a
 *     palette the USER picks a value from, or a colour that has to survive
 *     being shown over content Atlas did not draw. A theme key that could
 *     restate any of those would be a theme lying about someone else's colour.
 *
 * "It has a lot of them" is not a reason. For a single site inside an ordinary
 * file, use the inline marker below instead — it keeps the rest of the file
 * scanned.
 */
const EXEMPT_FILES: Record<string, string> = {
  "src/features/theme/theme-key-registry.ts":
    "Shape 1. The one table of Atlas's per-appearance default for every theme " +
    "key, so every entry is a colour literal by construction.",
  "src/features/agents/lib/agent-brand.ts":
    "Shape 2. The first-party agents' OWN brand colours — the one kind of " +
    "colour a theme key must not be able to restate (ADR-0002, and the " +
    "2026-09-18 key-set audit that deleted the eighteen `agent.*` keys).",
  "src/components/agent-icons.tsx":
    "Shape 2. The vendors' logo marks, drawn as inline SVG. Same argument as " +
    "`agent-brand.ts`: a recoloured logo is the wrong logo.",
  "src/components/agent-icons.test.tsx": "Shape 2. Asserts the marks above are drawn as shipped.",
  "src/features/knowledge/components/cover-picker.tsx":
    "Shape 2. The page-cover palette the user picks from. These are document " +
    "content, like a highlighter colour — the chrome around the picker is themed.",
  "src/features/spaces/lib/space-wire.ts":
    "Shape 2. The sticky-note and shape palette a user picks from on a space, " +
    "and the wire format those choices persist in. Theming them would repaint " +
    "other people's notes.",
  "src/features/spaces/lib/space-wire.test.ts": "Shape 2. Fixtures for the palette above.",
  "src/features/pdf/stores/pdf-annotation-store.ts":
    "Shape 2. Highlighter and ink colours the user picks and that are written " +
    "into the annotation, i.e. into the document.",
  "src/features/pdf/components/pdf-toolbar.tsx":
    "Shape 2. Renders the swatches for the ink colours above; the swatch has " +
    "to be the colour it applies.",
  "src/features/theme/color.ts":
    "Shape 1. The colour parser/mixer the resolver is built on. Its literals " +
    "are the identity values of the operations themselves.",
  "src/features/theme/resolve-theme.test.ts":
    "Shape 1. Fixture themes. A test for the resolver has to hand it colours.",
  "src/features/terminal/lib/line-emulator.ts":
    "Not a colour: it BUILDS `rgb(r,g,b)` strings out of the numeric " +
    "parameters of an ANSI escape sequence. The rule matches the format, not a " +
    "choice anyone made.",
  "src/features/telemetry/error-boundary.tsx":
    "Shape 2, of a kind: the last-resort screen after React has unmounted the " +
    "app. It is styled entirely inline, on purpose, so that it renders when " +
    "whatever broke was the thing that paints everything else.",
  "src/dev/mock-backend/badge.ts":
    "Shape 2, of a kind: the unmocked-command counter, injected into the DOM " +
    "by the dev mock backend. It has to stay legible over whatever theme is " +
    "being tested, INCLUDING a broken one, which is the situation it reports.",
};

/**
 * Whole DIRECTORIES that are exempt. Same bar as `EXEMPT_FILES`, and there is
 * exactly one shape that qualifies: a file whose COLOURS ARE ITS CONTENT.
 *
 * `src/dev` as a whole is NOT exempt — it renders, it is where every visual
 * check happens, and the gallery is the surface the scales are judged on. But
 * the mock fixtures are theme files and fake source listings: a fake `.tsx`
 * with `bg-red-500` in it is a string the editor renders as text, not a class
 * anything applies, and a built-in theme's JSON is 1,274 colour literals by
 * construction.
 */
const EXEMPT_DIRS: Record<string, string> = {
  "src/dev/mock-backend/fixtures":
    "The colours ARE the fixture: built-in and imported theme files (a theme " +
    "is nothing but literals), and the text of fake source files the editor " +
    "and diff surfaces render as content rather than apply as classes.",
};

/**
 * A single exempt site inside an otherwise ordinary file. Put
 * `ratchet-allow: <reason>` in a comment on the line itself, or anywhere in the
 * comment block directly above it, and that line stops counting — the rest of
 * the file keeps being scanned, which a whole-file entry would give up.
 *
 * The comment BLOCK, not just the previous line: a formatter decides where a
 * long value wraps, and a marker that only worked when the value happened to
 * fit on one line would be a marker that drifts back on under `oxfmt --write`.
 *
 * The reason is not decoration: a marker with fewer than 20 characters after
 * the colon fails the suite.
 */
const ALLOW_MARKER = /ratchet-allow:\s*(.*)$/;
// `{/*` too: in TSX, a comment above markup is a JSX expression, and a marker
// that only worked outside JSX would be a marker that cannot reach the markup.
const COMMENT_LINE = /^\s*(?:\{?\/\*|\/\/|\*)/;
const MIN_REASON = 20;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Would this file count against any rule if it were not exempt?
 *
 *  `match`, never `test`: the patterns are `/g`, so `test` carries `lastIndex`
 *  between calls and answers a different question each time it is asked. */
function violates(file: string): boolean {
  const text = readFileSync(file, "utf8");
  return RULES.some((rule) => text.match(rule.pattern) !== null);
}

interface ScanResult {
  counts: Record<string, number>;
  worst: Record<string, string[]>;
  /** Sites whose `ratchet-allow:` reason is too short to be one. */
  thinReasons: string[];
}

function scan(): ScanResult {
  const files = SCAN_ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root)));
  const counts: Record<string, number> = {};
  const perFile: Record<string, Map<string, number>> = {};
  const thinReasons: string[] = [];

  for (const rule of RULES) {
    counts[rule.id] = 0;
    perFile[rule.id] = new Map();
  }

  for (const file of files) {
    // Forward slashes whatever the OS: the exemption tables are keyed on them.
    const where = path.relative(REPO_ROOT, file).split(path.sep).join("/");
    if (where in EXEMPT_FILES) continue;
    if (Object.keys(EXEMPT_DIRS).some((dir) => where.startsWith(`${dir}/`))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    // Line by line rather than whole-file, so one allowed site does not exempt
    // its neighbours.
    const markerFor = (i: number): RegExpExecArray | null => {
      const own = ALLOW_MARKER.exec(lines[i]);
      if (own) return own;
      // Walk back over the contiguous comment block immediately above.
      for (let j = i - 1; j >= 0 && COMMENT_LINE.test(lines[j]); j--) {
        const found = ALLOW_MARKER.exec(lines[j]);
        if (found) return found;
      }
      return null;
    };
    const counted = lines
      .map((line, i) => {
        const marker = markerFor(i);
        if (!marker) return line;
        if (marker[1].trim().length < MIN_REASON) {
          thinReasons.push(`${where}:${i + 1} — "${marker[1].trim()}"`);
        }
        return "";
      })
      .join("\n");
    for (const rule of RULES) {
      const hits = counted.match(rule.pattern)?.length ?? 0;
      if (hits === 0) continue;
      counts[rule.id] += hits;
      perFile[rule.id].set(where, hits);
    }
  }

  const worst: Record<string, string[]> = {};
  for (const rule of RULES) {
    worst[rule.id] = [...perFile[rule.id].entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, n]) => `${file} (${n})`);
  }
  return { counts, worst, thinReasons };
}

describe("design-system ratchet", () => {
  const { counts, worst, thinReasons } = scan();

  it("every `ratchet-allow` carries a real reason", () => {
    // The marker is only worth having if writing one costs an argument.
    expect(
      thinReasons,
      [
        "A `ratchet-allow:` with no reason after it is just a suppression.",
        ...thinReasons.map((line) => `  ${line}`),
      ].join("\n"),
    ).toEqual([]);
  });

  it("every exempt file states why", () => {
    const thin = [...Object.entries(EXEMPT_FILES), ...Object.entries(EXEMPT_DIRS)]
      .filter(([, reason]) => reason.trim().length < 40)
      .map(([file]) => file);
    expect(
      thin,
      "An exempt file with no argument next to it is a number someone gave up on.",
    ).toEqual([]);
  });

  /**
   * An exemption for a path that no longer exists is not harmless: it is an
   * argument for a file nobody can read, and the next person to move a file
   * silently loses (or keeps) an exemption without noticing. Nothing else here
   * would fail — a missing path simply never matches.
   */
  it("every exemption still points at something", () => {
    const missing = [
      ...Object.keys(EXEMPT_FILES).filter(
        (file) =>
          !existsSync(path.join(REPO_ROOT, file)) || !statSync(path.join(REPO_ROOT, file)).isFile(),
      ),
      ...Object.keys(EXEMPT_DIRS).filter(
        (dir) =>
          !existsSync(path.join(REPO_ROOT, dir)) ||
          !statSync(path.join(REPO_ROOT, dir)).isDirectory(),
      ),
    ];
    expect(
      missing,
      "These exemptions name a path that is gone. Delete the entry, or fix the path.",
    ).toEqual([]);
  });

  /**
   * And an exemption for a file that no longer violates anything is dead
   * weight: it turns off scanning for a file that would now pass, so the next
   * violation added to it is invisible.
   */
  it("every exemption is still earning it", () => {
    const idle = [
      ...Object.keys(EXEMPT_FILES).filter((file) => !violates(path.join(REPO_ROOT, file))),
      ...Object.keys(EXEMPT_DIRS).filter(
        (dir) => !walk(path.join(REPO_ROOT, dir)).some((file) => violates(file)),
      ),
    ];
    expect(
      idle,
      "These exemptions no longer suppress anything. Delete the entry and let the file be scanned.",
    ).toEqual([]);
  });

  for (const rule of RULES.filter((r) => r.ceiling !== undefined)) {
    it(`holds \`${rule.id}\` at its ceiling`, () => {
      const ceiling = rule.ceiling ?? 0;
      expect(
        counts[rule.id],
        [
          `${counts[rule.id]} \`${rule.id}\` in ${SCAN_ROOTS.join(" + ")}; the ceiling is ${ceiling}.`,
          counts[rule.id] > ceiling
            ? `That is new debt. Use instead: ${rule.instead}`
            : `It went DOWN — set this rule's \`ceiling\` to ${counts[rule.id]} so the fix stays fixed.`,
          `Worst files: ${worst[rule.id].join(", ") || "none"}`,
        ].join("\n"),
      ).toBe(ceiling);
    });
  }

  for (const rule of RULES.filter((r) => r.ceiling === undefined)) {
    it(`has no \`${rule.id}\``, () => {
      expect(
        counts[rule.id],
        [
          `${counts[rule.id]} \`${rule.id}\` in ${SCAN_ROOTS.join(" + ")}; the target is 0.`,
          `Use instead: ${rule.instead}`,
          `Worst files: ${worst[rule.id].join(", ") || "none"}`,
          "",
          "If the value truly cannot come from the scale, put",
          "`ratchet-allow: <why>` in a comment on the line or the block above it —",
          "and make the reason an argument, because that comment is the record.",
          "",
          "The scales live in src/styles/globals.css; the reference is docs/reference/design-system.md.",
        ].join("\n"),
      ).toBe(0);
    });
  }
});
