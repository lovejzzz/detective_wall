import { useEffect } from "react";
import { useStore } from "../store.ts";
import { t } from "../lib/i18n.ts";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The undo step's label in the page's language (labels are written in English, with the note's title in quotes). */
export function undoLabel(label: string): string {
  const quoted = (s: string) => (s === "a note" ? t("a note") : s);
  let m: RegExpMatchArray | null;
  if ((m = label.match(/^Shredded “([\s\S]*)”$/))) return t("Shredded “{title}”", { title: m[1] });
  if ((m = label.match(/^Took down ([\s\S]*)$/))) return t("Took down {what}", { what: quoted(m[1]) });
  if ((m = label.match(/^Changed ([\s\S]*)$/))) return t("Changed {what}", { what: quoted(m[1]) });
  if ((m = label.match(/^Pinned (\d+) leads?$/))) return t(m[1] === "1" ? "Pinned 1 lead" : "Pinned {n} leads", { n: m[1] });
  if (label !== "Pinned a photo" && (m = label.match(/^Pinned ([\s\S]*)$/))) return t("Pinned {what}", { what: quoted(m[1]) });
  return t(label);
}

/** A torn paper slip after anything is taken down or cut: the way back is one click away. */
export function UndoSlip({ left }: { left: number }) {
  const last = useStore((s) => s.lastAction);
  const dismiss = useStore((s) => s.dismissLastAction);
  const show = !!last?.destructive;
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(dismiss, 7000);
    return () => clearTimeout(t);
  }, [show, last?.at, dismiss]);
  if (!show || !last) return null;
  return (
    <div className="undo-slip" style={{ left }} role="status" key={last.at}>
      <span>{undoLabel(last.label)}</span>
      <button onClick={() => useStore.getState().undo()}>
        {t("Undo")} <kbd>{isMac ? "⌘Z" : "Ctrl+Z"}</kbd>
      </button>
    </div>
  );
}
