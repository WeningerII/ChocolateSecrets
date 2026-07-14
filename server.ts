// Development server ONLY — Express wrapping Vite in middleware mode.
// Production is served by Firebase Hosting (`npm run build` + `firebase deploy
// --only hosting`); there is deliberately no production/serve-dist branch here.
// Backend features (Gemini proxy, shopping-list email/SMS) live in Cloud
// Functions (see functions/src/), not in this server — ADR-0006.
import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
  });
}

startServer();
