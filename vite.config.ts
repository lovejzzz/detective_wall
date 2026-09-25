import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleApi } from "./server/api.ts";

// Serves /api/* from the same dev server so `npm run dev` is one process.
function apiDevPlugin(): Plugin {
  return {
    name: "detective-wall-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        handleApi(req, res).catch(next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), apiDevPlugin()] };
});
