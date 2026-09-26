import { useEffect, useRef, useState } from "react";
import { LANGS, setLang, t, useLang } from "../lib/i18n.ts";
import { useStore } from "../store.ts";
import { onSoundChange, setSound, soundOn } from "../lib/sound.ts";

/** Two index-card tabs at the top of the wall: the free wall, or the evidence in time order. */
export function ViewTabs({ left }: { left: number }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <div className="view-tabs" style={{ left }} role="tablist" aria-label={t("Layout")}>
      {(
        [
          ["wall", t("Wall")],
          ["timeline", t("Timeline")],
        ] as const
      ).map(([v, label]) => (
        <button key={v} role="tab" aria-selected={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)} title={`${label} (T)`}>
          {label}
        </button>
      ))}
      <button className="arrange-switch" onClick={() => useStore.getState().arrangeWall()} title={t("Arrange the wall in reading order (A)")} aria-label={t("Arrange the wall")}>
        <svg viewBox="0 0 18 14" aria-hidden>
          <rect x="1" y="1" width="4" height="5" rx="0.6" />
          <rect x="7" y="1" width="4" height="5" rx="0.6" />
          <rect x="13" y="1" width="4" height="5" rx="0.6" />
          <rect x="1" y="8" width="4" height="5" rx="0.6" />
          <rect x="7" y="8" width="4" height="5" rx="0.6" />
        </svg>
      </button>
      <SettingsSwitch />
    </div>
  );
}

/** A gear on the strip that opens a small index card: the page's language, and its sound. */
function SettingsSwitch() {
  const [open, setOpen] = useState(false);
  const [sound, setSoundState] = useState(soundOn());
  const lang = useLang();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => onSoundChange(setSoundState), []);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="settings" ref={box}>
      <button
        className={`settings-switch ${open ? "is-on" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("Settings")}
        title={t("Settings")}
      >
        <svg viewBox="0 0 20 20" aria-hidden>
          <path d="M10 6.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm7.3 4.6-1.6-.3a5.8 5.8 0 0 1-.6 1.5l1 1.3-1.5 1.5-1.3-1a5.8 5.8 0 0 1-1.5.6l-.3 1.6h-2.1l-.3-1.6a5.8 5.8 0 0 1-1.5-.6l-1.3 1-1.5-1.5 1-1.3a5.8 5.8 0 0 1-.6-1.5l-1.6-.3V9.1l1.6-.3c.1-.5.3-1 .6-1.5l-1-1.3 1.5-1.5 1.3 1c.5-.3 1-.5 1.5-.6l.3-1.6h2.1l.3 1.6c.5.1 1 .3 1.5.6l1.3-1 1.5 1.5-1 1.3c.3.5.5 1 .6 1.5l1.6.3z" />
        </svg>
        {!sound && <span className="settings-muted" aria-hidden />}
      </button>
      {open && (
        <div className="settings-card" role="dialog" aria-label={t("Settings")}>
          <h3>{t("Settings")}</h3>
          <div className="settings-row">
            <span className="settings-label">{t("Language")}</span>
            <div className="settings-choice" role="radiogroup" aria-label={t("Language")}>
              {LANGS.map((l) => (
                <button key={l.id} role="radio" aria-checked={lang === l.id} className={lang === l.id ? "is-on" : ""} onClick={() => setLang(l.id)} lang={l.id === "zh" ? "zh-Hans" : "en"}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <span className="settings-label">{t("Sound")}</span>
            <div className="settings-choice" role="radiogroup" aria-label={t("Sound")}>
              {([true, false] as const).map((v) => (
                <button key={String(v)} role="radio" aria-checked={sound === v} className={sound === v ? "is-on" : ""} onClick={() => setSound(v)}>
                  {v ? t("On") : t("Off")}
                </button>
              ))}
            </div>
          </div>
          <p className="settings-hint">{t("M turns the sound on and off anywhere.")}</p>
        </div>
      )}
    </div>
  );
}
