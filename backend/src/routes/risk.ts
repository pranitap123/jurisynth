import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import * as risk from "../services/risk.js";

export const riskRouter = Router();
riskRouter.use(requireAuth);

const scoreSchema = z.object({
  case_length: z.number().nonnegative(),
  num_prior_citations: z.number().nonnegative(),
  num_parties: z.number().min(1),
  statute_severity: z.number().min(0).max(1),
});

riskRouter.post("/score", (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }
  const { case_length, num_prior_citations, num_parties, statute_severity } = parsed.data;

  try {
    const { score, version } = risk.scoreCase(
      case_length,
      num_prior_citations,
      num_parties,
      statute_severity
    );
    res.json({ risk_score: score, model_version: version });
  } catch (err) {
    res.status(503).json({ detail: (err as Error).message });
  }
});
