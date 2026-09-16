import express from "express";
import cors from "cors";
import { config } from "./core/config.js";
import { authRouter } from "./routes/auth.js";
import { casesRouter } from "./routes/cases.js";
import { riskRouter } from "./routes/risk.js";

export const app = express();

/*
  Vercel gives every deployment a unique preview URL
  (jurisynth-<hash>-<user>.vercel.app) in addition to your stable
  production one, so a single hardcoded origin string breaks the moment
  you redeploy. This allows:
    - any origin listed in CORS_ORIGIN (comma-separated — put your stable
      production URL and http://localhost:5173 there)
    - any *.vercel.app subdomain, so preview deployments aren't blocked
  For a private/internal app you'd tighten this to exact origins only;
  for a public portfolio demo, allowing preview URLs is a reasonable
  trade-off against having to update an env var on every deploy.
*/
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin requests, curl, server-to-server
  if (config.corsOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/cases", casesRouter);
app.use("/risk", riskRouter);

// Centralized error handler — catches anything a route didn't handle
// itself, so a thrown error becomes a clean JSON 500 instead of Express's
// default HTML stack trace page (which you never want to leak in prod).
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
});