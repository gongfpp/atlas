import { toast } from "sonner";
import { ActionKbd } from "@/features/keybindings/components/action-kbd";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/features/layout/stores/layout-store";
import { LAYOUT_TEMPLATES, type LayoutTemplate } from "@/features/layout/templates";
import { LayoutThumbnail } from "@/features/layout/components/layout-thumbnail";

/** Settings → Layouts: the same predefined templates the layout switcher
 *  (`nav.layoutSwitcher`) offers, applied with a click. */
export function LayoutsSettings() {
  const apply = (t: LayoutTemplate) => {
    useLayoutStore.getState().actions.applyLayoutTemplate(t);
    toast.success(`Applied “${t.name}” layout`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Layouts</h2>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Rearrange panels and tabs into a ready-made project. Press{" "}
          <ActionKbd id="nav.layoutSwitcher" size="2xs" fallback="⌘⌥L" /> anytime to switch layouts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LAYOUT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => apply(t)}
            className={cn(
              "text-left rounded-xl border border-border bg-card p-3",
              "hover:border-border-strong transition-colors outline-none",
            )}
          >
            <LayoutThumbnail template={t} />
            <div className="mt-2 text-xs font-medium text-foreground">{t.name}</div>
            <div className="text-3xs text-muted-foreground leading-snug">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
