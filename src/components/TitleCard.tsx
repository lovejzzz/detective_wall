// Opening a case plays like a cut in a film: black, the file number and the title fade up as
// their spacing settles, then the lights come up on the wall. About two seconds; any click or
// key skips it. Not for a blank new case (straight to the typewriter), not with reduced motion.
import { useEffect, useState } from "react";
import { useStore } from "../store.ts";
import { reducedMotion } from "../lib/motion.ts";
import { useBooted } from "../lib/boot.ts";
import { caseNumbers, caseStats, fileNo } from "../lib/cases.ts";

const HOLD_MS = 1500;
const OUT_MS = 700;
const SEEN_KEY = "detective-wall/title-seen";

/** The case the card last played for this page load (undefined: nothing opened yet). */
let shownFor: string | null | undefined;

export function TitleCard() {
  const activeId = useStore((s) => s.activeId);
  const [card, setCard] = useState<{ key: string; no: string; title: string; meta: string } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const booted = useBooted();
  // The card is up from the very first frame (black, still), so nothing shows before it; its
  // lettering and its clock only start once the page has faded in.
  useEffect(() => {
    // Once per case opened (an effect that runs twice for the same case is the same opening).
    if (shownFor === activeId) return;
    const isFirst = shownFor === undefined;
    shownFor = activeId;
    const s = useStore.getState();
    const c = activeId ? s.cases[activeId] : undefined;
    if (!c || c.notes.length === 0 || reducedMotion()) return;
    // On page load, once per session; on every switch after that.
    if (isFirst) {
      try {
        if (sessionStorage.getItem(SEEN_KEY)) return;
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* storage unavailable: show it */
      }
    }
    const st = caseStats(c);
    setLeaving(false);
    setCard({
      key: `${c.id}-${Date.now()}`,
      no: `Case file ${fileNo(caseNumbers(s.cases).get(c.id))}`,
      title: c.title,
      meta: [st.span, `${st.exhibits} ${st.exhibits === 1 ? "exhibit" : "exhibits"}`, st.verdict].filter(Boolean).join("  ·  "),
    });
  }, [activeId]);
  useEffect(() => {
    if (!card || !booted) return;
    const out = setTimeout(() => setLeaving(true), HOLD_MS);
    const gone = setTimeout(() => setCard(null), HOLD_MS + OUT_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [card, booted]);

  useEffect(() => {
    if (!card) return;
    const skip = () => {
      setLeaving(true);
      setTimeout(() => setCard(null), 320);
    };
    window.addEventListener("keydown", skip, { once: true });
    return () => window.removeEventListener("keydown", skip);
  }, [card]);

  if (!card) return null;
  return (
    <div
      key={card.key}
      className={`title-card ${leaving ? "is-leaving" : ""} ${booted ? "" : "is-waiting"}`}
      onPointerDown={() => {
        setLeaving(true);
        setTimeout(() => setCard(null), 320);
      }}
      role="presentation"
    >
      <div className="title-inner">
        <p className="title-no">{card.no}</p>
        <h1 className="title-name">{card.title}</h1>
        <span className="title-rule" aria-hidden />
        {card.meta && <p className="title-meta">{card.meta}</p>}
      </div>
    </div>
  );
}
