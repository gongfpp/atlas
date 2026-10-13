import { KbdCombo, KbdKeys, type KbdSize } from "@/ui/kbd";
import type { ActionId } from "../lib/actions";
import { useActionShortcut } from "../lib/use-action-shortcut";

/** The live keycaps for an action in the active profile. Renders `fallback`
 *  (a combo string) when the action is unbound, and nothing without one. */
export function ActionKbd({
  id,
  size,
  fallback,
  className,
}: {
  id: ActionId;
  size?: KbdSize;
  fallback?: string;
  className?: string;
}) {
  const shortcut = useActionShortcut(id);
  if (shortcut) return <KbdKeys keys={shortcut.keys} size={size} className={className} />;
  if (fallback) return <KbdCombo combo={fallback} size={size} className={className} />;
  return null;
}
