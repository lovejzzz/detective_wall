import { useEffect } from "react";
import { useStore } from "../store.ts";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

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
      <span>{last.label}</span>
      <button onClick={() => useStore.getState().undo()}>
        Undo <kbd>{isMac ? "⌘Z" : "Ctrl+Z"}</kbd>
      </button>
    </div>
  );
}
