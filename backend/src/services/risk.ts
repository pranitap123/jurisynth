import fs from "node:fs";
import path from "node:path";

const MODEL_PATH = path.resolve("./ml/risk-model.json");

interface RiskModel {
  weights: number[];
  bias: number;
  means: number[];
  stds: number[];
  version: string;
}

let model: RiskModel | null = null;

function loadModel(): RiskModel {
  if (model) return model;
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error("Risk model not found. Run `npm run train:risk` first.");
  }
  model = JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8"));
  return model!;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function scoreCase(
  caseLength: number,
  numPriorCitations: number,
  numParties: number,
  statuteSeverity: number
): { score: number; version: string } {
  const m = loadModel();
  const raw = [caseLength, numPriorCitations, numParties, statuteSeverity];
  // Feature scaling MUST match training exactly (same means/stds) — a
  // train/serve mismatch here is one of the most common real ML bugs.
  const standardized = raw.map((v, j) => (v - m.means[j]) / m.stds[j]);
  const z = standardized.reduce((s, x, j) => s + x * m.weights[j], m.bias);
  return { score: sigmoid(z), version: m.version };
}
