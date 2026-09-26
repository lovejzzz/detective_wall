import { useEffect, useState } from "react";
import { useStore } from "../store.ts";
import { onSoundChange, setSound, soundOn } from "../lib/sound.ts";

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
      <SoundSwitch />
    </div>
  );
}

/** Sound on or off (M). */
function SoundSwitch() {
  const [on, setOn] = useState(soundOn());
  useEffect(() => onSoundChange(setOn), []);
  return (
    <button
      className={`sound-switch ${on ? "is-on" : ""}`}
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? "Sound on" : "Sound off"}
      title={on ? "Sound on (M to mute)" : "Sound off (M)"}
    >
      <svg viewBox="0 0 20 16" aria-hidden>
        <path d="M2 5.5h3l4-3.5v12l-4-3.5H2z" />
        {on ? (
          <>
            <path className="wave" d="M12 5.2c1.1.8 1.1 4.8 0 5.6" />
            <path className="wave" d="M14.6 3.2c2.2 1.6 2.2 8 0 9.6" />
          </>
        ) : (
          <path className="wave" d="M12.5 5.5l5 5m0-5l-5 5" />
        )}
      </svg>
    </button>
  );
}
