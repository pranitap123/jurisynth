/*
  Trains the risk-scoring model with a hand-rolled logistic regression
  (gradient descent), not XGBoost — XGBoost's Node bindings pull in a
  native compiled library, which is exactly the kind of dependency that
  made the Python Docker build slow. Logistic regression is a real,
  understood, from-scratch ML pipeline: worse than a gradient-boosted tree
  at capturing feature interactions, but simpler to implement correctly,
  debug, and explain end to end in an interview — which matters more than
  the algorithm name on a resume.

  BE HONEST ABOUT THIS: this trains on synthetic, hand-generated features,
  same as the Python version did. The point is a real, understood
  train -> save -> load -> predict pipeline, not a validated accuracy claim.
  If asked "what's your model's real-world accuracy," say plainly:
  "unvalidated against real case outcomes — trained on synthetic data to
  prove the pipeline end to end."

  Run: npm run train:risk
*/
import fs from "node:fs";
import path from "node:path";

const N_SAMPLES = 2000;
const N_FEATURES = 4; // caseLength, numPriorCitations, numParties, statuteSeverity
const LEARNING_RATE = 0.1;
const EPOCHS = 300;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeSyntheticDataset(): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];

  for (let i = 0; i < N_SAMPLES; i++) {
    const caseLength = randRange(200, 20000);
    const numPriorCitations = randRange(0, 50);
    const numParties = randRange(1, 10);
    const statuteSeverity = randRange(0, 1);

    const logit =
      0.00003 * caseLength +
      0.03 * numPriorCitations +
      0.08 * numParties +
      1.5 * statuteSeverity -
      2.0;
    const prob = 1 / (1 + Math.exp(-logit));
    const label = Math.random() < prob ? 1 : 0;

    X.push([caseLength, numPriorCitations, numParties, statuteSeverity]);
    y.push(label);
  }
  return { X, y };
}

function standardize(X: number[][]): { Xs: number[][]; means: number[]; stds: number[] } {
  const means = new Array(N_FEATURES).fill(0);
  const stds = new Array(N_FEATURES).fill(0);

  for (let j = 0; j < N_FEATURES; j++) {
    means[j] = X.reduce((s, row) => s + row[j], 0) / X.length;
  }
  for (let j = 0; j < N_FEATURES; j++) {
    const variance = X.reduce((s, row) => s + (row[j] - means[j]) ** 2, 0) / X.length;
    stds[j] = Math.sqrt(variance) || 1;
  }
  const Xs = X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { Xs, means, stds };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function trainLogisticRegression(Xs: number[][], y: number[]) {
  let weights = new Array(N_FEATURES).fill(0);
  let bias = 0;
  const n = Xs.length;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gradW = new Array(N_FEATURES).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const z = Xs[i].reduce((s, x, j) => s + x * weights[j], bias);
      const pred = sigmoid(z);
      const error = pred - y[i];
      for (let j = 0; j < N_FEATURES; j++) gradW[j] += error * Xs[i][j];
      gradB += error;
    }

    for (let j = 0; j < N_FEATURES; j++) weights[j] -= (LEARNING_RATE * gradW[j]) / n;
    bias -= (LEARNING_RATE * gradB) / n;
  }

  return { weights, bias };
}

function evaluateAccuracy(Xs: number[][], y: number[], weights: number[], bias: number): number {
  let correct = 0;
  for (let i = 0; i < Xs.length; i++) {
    const z = Xs[i].reduce((s, x, j) => s + x * weights[j], bias);
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === y[i]) correct++;
  }
  return correct / Xs.length;
}

function main() {
  const { X, y } = makeSyntheticDataset();
  const { Xs, means, stds } = standardize(X);

  const splitAt = Math.floor(Xs.length * 0.8);
  const { weights, bias } = trainLogisticRegression(Xs.slice(0, splitAt), y.slice(0, splitAt));

  const trainAcc = evaluateAccuracy(Xs.slice(0, splitAt), y.slice(0, splitAt), weights, bias);
  const testAcc = evaluateAccuracy(Xs.slice(splitAt), y.slice(splitAt), weights, bias);

  console.log(`Train accuracy on synthetic data: ${trainAcc.toFixed(3)}`);
  console.log(`Test accuracy on synthetic data:  ${testAcc.toFixed(3)}`);
  console.log("(Meaningless outside this synthetic dataset — proves the training loop works.)");

  const outPath = path.resolve("./ml/risk-model.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify({ weights, bias, means, stds, version: "synthetic-v1" }, null, 2)
  );
  console.log(`Saved model to ${outPath}`);
}

main();
