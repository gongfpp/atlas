import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every keyboard shortcut the app shows is drawn as keycaps, one per key.
 *
 * Not as text ("⇧⌘N" trailing a button, "Press ⌘K for…", "Hide sidebar (⌘B)"),
 * and not as one cap holding a whole combo. The caps are `src/ui/kbd.tsx`, and
 * the places shortcuts usually go already draw them from a plain combo string:
 * `Hint`'s `shortcut`, `HintItem`'s `shortcut`, the dock's `shortcut`, and the
 * menus' `ContextMenuShortcut` / `DropdownMenuShortcut`. A shortcut written as
 * text renders, type-checks and lints — this suite is the only thing that sees
 * it.
 *
 * What counts: a key glyph (⌘ ⇧ ⌥ ⌃ ⌫ ⏎ ↵ ⇥ ↩ ⎋) or a spelled-out combo
 * ("Ctrl+P", "Cmd+K") anywhere in a source line once the places a combo string
 * legitimately lives are removed: `combo=`, `shortcut=` / `shortcut:`, a
 * single-key `<Kbd>`, `keys={[…]}`, a menu `…Shortcut` slot, and comments. And a
 * live binding interpolated into prose — `` `Find (${findHint})` `` — which no
 * glyph search can see.
 *
 * A few strings cannot hold an element at all: an input `placeholder`, a
 * toast's text, a native `title`. A site like that takes `keycap-allow:
 * <reason>` on the line or in the comment block above, and the reason has to be
 * an argument (20+ characters), as with `ratchet-allow`.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["src/features", "src/components", "src/ui", "src/dev"];
/** Where combos are parsed and spelled, not shown. */
const SKIP = ["src/features/keybindings/lib/", "src/dev/mock-backend/fixtures/"];

const GLYPH = /[⌘⇧⌥⌃⌫⏎↵⇥↩⎋]/;
const SPELLED =
  /\b(?:Ctrl|Cmd|Command|Alt|Option|Shift|Control)\s*\+\s*[A-Za-z0-9↵,./]|\((?:Esc|Escape|Enter|Return|Tab|Space|Delete|Backspace)\)/;
/** A live binding pasted into prose: `(${saveHint})`, `${saveShortcut.label}`.
 *  Matched by name, so the variable holding a binding should be named for it. */
const INTERPOLATED =
  /\$\{\s*\w*(?:Hint|Keys|Shortcut|Chord|hint|shortcut|chord)(?:\??\.label)?\s*\}/;
/** …or rendered straight into markup: `<span>{hint}</span>`, `<Kbd>{kbd}</Kbd>`. */
const RENDERED =
  /(?<![=\w])\{\s*\w*(?:Hint|Keys|Shortcut|Chord|Kbd|hint|shortcut|chord|kbd)(?:\??\.label)?\s*\}\s*(?:<\/|$)/;
/** A hand-made keycap. `Kbd` is the one; it is also the one the theme reaches. */
const RAW_KBD = /<kbd\b/;

/** The constructs a combo string is allowed to appear in. */
const ALLOWED: RegExp[] = [
  /\b(?:combo|fallback)=(?:"[^"]*"|\{[^}]*\})/g,
  /\bshortcut[=:]\s*(?:"[^"]*"|'[^']*'|`[^`]*`|\{[^}]*\})/g,
  // A combo assigned to a variable named for one: `const shortcut = isMac ? …`.
  /\b\w*(?:[Ss]hortcut|Hint|Chord)\s*=\s*[^=].*$/g,
  // ARIA spells keys as words, by specification.
  /\baria-keyshortcuts=(?:"[^"]*"|\{[^}]*\})/g,
  /\bkeys(?:=\{|:\s*)\[[^\]]*\]\}?/g,
  /<Kbd\b[^>]*>[^<]*<\/Kbd>/g,
  /<(?:Context|Dropdown)MenuShortcut\b[^>]*>[^<]*<\/(?:Context|Dropdown)MenuShortcut>/g,
];
/** A cap must hold one key. "⌘K" or "↑↓" in one `<Kbd>` is two keys in one cap. */
const MULTI_KEY_CAP = /<Kbd\b[^>]*>\s*(?:[⌘⇧⌥⌃][^<\s]|[↑↓←→]{2})[^<]*<\/Kbd>/;

const ALLOW_MARKER = /keycap-allow:\s*(.*)$/;
const COMMENT_LINE = /^\s*(?:\{?\/\*|\/\/|\*)/;
const MIN_REASON = 20;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

interface Hit {
  where: string;
  text: string;
}

function scan(): { hits: Hit[]; thin: string[] } {
  const hits: Hit[] = [];
  const thin: string[] = [];
  for (const file of SCAN_ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root)))) {
    const where = path.relative(REPO_ROOT, file).split(path.sep).join("/");
    if (SKIP.some((prefix) => where.startsWith(prefix))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    let inBlockComment = false;
    lines.forEach((line, i) => {
      // A block comment's middle lines need not start with `*` (JSX `{/* … */}`
      // prose wraps freely), so the state is carried line to line.
      const opens = line.lastIndexOf("/*");
      const closes = line.lastIndexOf("*/");
      const wasInComment = inBlockComment;
      if (opens > closes) inBlockComment = true;
      else if (closes > -1) inBlockComment = false;
      if (wasInComment || COMMENT_LINE.test(line)) return;
      const marker =
        ALLOW_MARKER.exec(line) ??
        (() => {
          for (let j = i - 1; j >= 0 && COMMENT_LINE.test(lines[j]); j--) {
            const found = ALLOW_MARKER.exec(lines[j]);
            if (found) return found;
          }
          return null;
        })();
      if (marker) {
        if (marker[1].trim().length < MIN_REASON) thin.push(`${where}:${i + 1}`);
        return;
      }
      // A trailing `// …` is a comment too.
      const code = line.replace(/\s\/\/.*$/, "");
      const bare = ALLOWED.reduce((text, allowed) => text.replace(allowed, ""), code);
      if (
        GLYPH.test(bare) ||
        SPELLED.test(bare) ||
        INTERPOLATED.test(code) ||
        RENDERED.test(code) ||
        MULTI_KEY_CAP.test(code) ||
        (RAW_KBD.test(code) && where !== "src/ui/kbd.tsx")
      ) {
        hits.push({ where: `${where}:${i + 1}`, text: line.trim() });
      }
    });
  }
  return { hits, thin };
}

describe("shortcut keycaps", () => {
  const { hits, thin } = scan();

  it("draws every shown shortcut as keycaps, one per key", () => {
    expect(
      hits.map((h) => `${h.where}  ${h.text}`),
      [
        `${hits.length} shortcut(s) drawn as text, or several keys in one cap.`,
        "Pass the combo string to `shortcut` (Hint / HintItem / dock item), a menu's",
        "`…Shortcut` slot, or `<KbdCombo combo=… />` / `<KbdKeys keys=… />` from",
        "src/ui/kbd.tsx. A string that cannot hold an element takes",
        "`keycap-allow: <reason>`.",
      ].join("\n"),
    ).toEqual([]);
  });

  it("every `keycap-allow` carries a real reason", () => {
    expect(thin).toEqual([]);
  });
});
