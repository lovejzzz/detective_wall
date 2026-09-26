import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { ensureCases, useStore } from "./store.ts";
import { installTextures } from "./lib/textures.ts";
import { startBoot } from "./lib/boot.ts";
import { getLang, onLangChange, useLang } from "./lib/i18n.ts";
import { fontsReady } from "./scene/paint.ts";
import { checkPartner } from "./ai/partner.ts";
import { startSoundDirector } from "./lib/soundDirector.ts";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/600.css";
import "@fontsource/caveat/700.css";
import "@fontsource/special-elite/400.css";
import "@fontsource/old-standard-tt/400.css";
import "@fontsource/old-standard-tt/400-italic.css";
import "@fontsource/old-standard-tt/700.css";
import "@fontsource/courier-prime/400.css";
// Chinese: loaded piece by piece, only for the characters on the page
import "@fontsource/long-cang/400.css";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/700.css";
import "./styles.css";

installTextures();
// Hold the page back until its fonts are in and the wall has drawn, then fade it all up at once.
startBoot(fontsReady(activeText()));
ensureCases();
// On a phone the notepad is a sheet over half the screen: a case that already has a wall opens
// with it folded, so the wall is what you see first.
if (window.innerWidth < 760) {
  const s = useStore.getState();
  const c = s.activeId ? s.cases[s.activeId] : undefined;
  if (c && c.notes.length > 1 && s.notepadOpen) useStore.setState({ notepadOpen: false });
}
void checkPartner();
startSoundDirector();

/** Everything the open case will paint, so its Chinese glyphs can be fetched before the page shows. */
function activeText(): string {
  const s = useStore.getState();
  const c = s.activeId ? s.cases[s.activeId] : undefined;
  if (!c) return "";
  return [c.title, ...c.notes.map((n) => `${n.title}${n.body}${JSON.stringify(n.subject ?? "")}${JSON.stringify(n.diagram ?? "")}`)].join("");
}

document.documentElement.lang = getLang() === "zh" ? "zh-Hans" : "en";
// The prepared case files are rewritten in the new language (cases you started stay as written).
onLangChange(() => ensureCases());

/** A change of language re-lays the whole page in the new one (rare, so a clean remount). */
function Root() {
  const lang = useLang();
  return <App key={lang} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
