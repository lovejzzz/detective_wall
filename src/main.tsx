import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { ensureCases } from "./store.ts";
import { installTextures } from "./lib/textures.ts";
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
ensureCases();
void checkPartner();
startSoundDirector();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
