import { Popover } from "@base-ui/react/popover";
import { Copy, Download, FileText, FileType2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { HintItem } from "@/ui/hint-group";
import { DockButton, DOCK_TRIGGER, HeaderDock } from "@/features/artifacts/components/header-dock";
import type { DateRange } from "../types";
import { DateRangeControl } from "./date-range-control";

export type ExportKind = "pdf" | "jpeg" | "markdown" | "copy-markdown";

/**
 * The Usage header: what window you are looking through, and the two actions
 * on the page.
 *
 * Built to the Timeline's bar rather than its own thing — a name on the left,
 * one round-ended track for the setting, one icon dock on the right. What it
 * replaced drew five bordered boxes across two rows (presets, custom, export,
 * and a label-plus-box for each of group and metric) plus an app icon, which
 * is a lot of chrome to say "last 30 days".
 *
 * No Atlas mark: a tab inside the app does not need to say which app it is,
 * and it was the only icon in a bar whose other glyphs all do something.
 */
export function UsageHeader({
  orgName,
  range,
  onRange,
  earliest,
  onExport,
  onRefresh,
  loading,
  canExport,
  inset,
}: {
  orgName: string | null;
  range: DateRange;
  onRange: (r: DateRange) => void;
  earliest: string | null;
  onExport: (kind: ExportKind) => void;
  onRefresh: () => void;
  loading: boolean;
  canExport: boolean;
  /** The card's inset, so the bar's ends line up with the body below it. */
  inset: number;
}) {
  return (
    <div
      className="flex h-control-lg shrink-0 items-center gap-2"
      style={{ paddingInline: inset + 6 }}
    >
      <span className="shrink-0 text-sm font-semibold text-foreground">Usage</span>
      {orgName && (
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={orgName}>
          {orgName}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <DateRangeControl range={range} onChange={onRange} earliest={earliest} />
        {/* No `HintGroup` of its own: `HeaderDock` already is one, and nesting
            a second group gives the dock two sliding tooltips racing the same
            pointer. */}
        <HeaderDock>
          <ExportMenu onExport={onExport} disabled={!canExport} />
          <DockButton label="Reload usage" onClick={onRefresh}>
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
          </DockButton>
        </HeaderDock>
      </div>
    </div>
  );
}

/** `ext` is the file a row writes. The copy row writes none — it used to show
 *  "⌘C" there, a shortcut nothing was bound to. */
const ITEMS: ReadonlyArray<{ kind: ExportKind; label: string; ext?: string; icon: typeof Copy }> = [
  { kind: "pdf", label: "PDF report", ext: ".pdf", icon: FileType2 },
  { kind: "jpeg", label: "JPEG image", ext: ".jpg", icon: ImageIcon },
  { kind: "markdown", label: "Markdown report", ext: ".md", icon: FileText },
  { kind: "copy-markdown", label: "Copy as Markdown", icon: Copy },
];

/** Export, as a dock glyph — same shape the Timeline's export takes. */
function ExportMenu({
  onExport,
  disabled,
}: {
  onExport: (kind: ExportKind) => void;
  disabled: boolean;
}) {
  return (
    <Popover.Root>
      <HintItem label="Export usage">
        <Popover.Trigger
          render={
            <button
              type="button"
              disabled={disabled}
              className={cn(DOCK_TRIGGER, "disabled:opacity-40")}
            >
              <Download size={12} strokeWidth={1.7} />
            </button>
          }
        />
      </HintItem>
      <Popover.Portal>
        {/* z-index belongs to the Positioner — the Popup is static inside it.
            `--transform-origin` is Base UI's spelling of Radix's
            `--radix-popover-content-transform-origin`. */}
        <Popover.Positioner className="z-popover" align="end" sideOffset={6}>
          <Popover.Popup className="w-[196px] origin-(--transform-origin) overflow-hidden rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-2xl data-closed:animate-scale-out data-open:animate-scale-in">
            {ITEMS.map((item) => (
              <Popover.Close
                key={item.kind}
                render={
                  <button
                    type="button"
                    onClick={() => onExport(item.kind)}
                    className="flex h-control-md w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs text-secondary-foreground outline-none transition-colors hover:bg-element-hover hover:text-foreground"
                  >
                    <item.icon size={12} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.ext && (
                      <span className="shrink-0 text-2xs text-disabled">{item.ext}</span>
                    )}
                  </button>
                }
              />
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
