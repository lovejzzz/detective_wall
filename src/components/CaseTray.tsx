import { useState } from "react";
import { ensureCases, useStore } from "../store.ts";

/** Manila folders poking out of the left edge, one per case (SPEC §4). */
export function CaseTray() {
  const order = useStore((s) => s.order);
  const cases = useStore((s) => s.cases);
  const activeId = useStore((s) => s.activeId);
  const [shredding, setShredding] = useState<string | null>(null);

  const newCase = () => useStore.getState().newCase();

  return (
    <nav className="tray" aria-label="Cases">
      <div className="tray-label">Cases</div>
      <ol>
        {order.map((id, i) => {
          const c = cases[id];
          if (!c) return null;
          const active = id === activeId;
          const pinned = c.notes.filter((n) => n.status === "pinned").length;
          return (
            <li key={id} className={`folder ${active ? "is-active" : ""}`} style={{ ["--i" as string]: i }}>
              <button
                className="folder-body"
                onClick={() => useStore.getState().switchCase(id)}
                aria-current={active ? "true" : undefined}
                title={c.title}
              >
                <span className="folder-no">No. {String(order.length - i).padStart(3, "0")}</span>
                <span className="folder-title">{c.title}</span>
                <span className="folder-meta">
                  {pinned} {pinned === 1 ? "exhibit" : "exhibits"}
                </span>
                <span className="folder-spine" aria-hidden>
                  {c.title}
                </span>
              </button>
              {shredding === id ? (
                <span className="shred-confirm">
                  Shred?
                  <button
                    onClick={() => {
                      useStore.getState().deleteCase(id);
                      setShredding(null);
                      ensureCases();
                    }}
                  >
                    yes
                  </button>
                  <button onClick={() => setShredding(null)}>no</button>
                </span>
              ) : (
                <button className="folder-x" onClick={() => setShredding(id)} aria-label={`Delete case ${c.title}`} title="Shred this case">
                  ×
                </button>
              )}
            </li>
          );
        })}
        <li className="folder is-new" style={{ ["--i" as string]: order.length }}>
          <button className="folder-body" onClick={newCase}>
            <span className="folder-title">New case</span>
            <span className="folder-spine" aria-hidden>
              +
            </span>
          </button>
        </li>
      </ol>
    </nav>
  );
}
