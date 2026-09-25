import { useStore } from "../store.ts";

/** Two index-card tabs at the top of the wall: the free wall, or the evidence in time order. */
export function ViewTabs({ left }: { left: number }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <div className="view-tabs" style={{ left }} role="tablist" aria-label="Layout">
      {(
        [
          ["wall", "Wall"],
          ["timeline", "Timeline"],
        ] as const
      ).map(([v, label]) => (
        <button key={v} role="tab" aria-selected={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)} title={`${label} (T)`}>
          {label}
        </button>
      ))}
    </div>
  );
}
