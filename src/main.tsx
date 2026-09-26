import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { ensureCases, useStore } from "./store.ts";
import { installTextures } from "./lib/textures.ts";
import { startBoot } from "./lib/boot.ts";
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
import "./styles.css";

installTextures();
// Hold the page back until its fonts are in and the wall has drawn, then fade it all up at once.
startBoot(fontsReady());
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
