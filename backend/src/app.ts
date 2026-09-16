import express from "express";
import cors from "cors";
import { config } from "./core/config.js";
import { authRouter } from "./routes/auth.js";
import { casesRouter } from "./routes/cases.js";
import { riskRouter } from "./routes/risk.js";

export const app = express();

app.use(cors({
  origin: "https://jurisynth.vercel.app",
  credentials: true,
}));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
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
