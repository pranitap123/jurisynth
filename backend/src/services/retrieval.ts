/*
  Semantic search over case text, with two swappable backends:

  1. 'local' (default): feature-hashed bag-of-words vectors, pure JS, zero
     native dependencies, zero downloads, zero API cost. This is the
     honest tradeoff for build speed: it captures word-overlap-style
     semantic similarity reasonably well for a small demo corpus, but it
     is NOT a real embedding model — it won't understand synonyms
     ("landlord" vs "lessor") the way a transformer embedding would.
     Say this plainly if asked; don't call this "LLM-powered search."

  2. 'openai': real LLM embeddings (text-embedding-3-small), meaningfully
     better semantic quality, but adds an API key requirement, network
     latency, and per-call cost. Enable by setting EMBEDDING_PROVIDER=openai
     and OPENAI_API_KEY in .env — the rest of the app doesn't change at all,
     because both backends implement the same embed() function shape. That
     interchangeability is the actual design point worth mentioning in an
     interview: the vector store doesn't know or care which embedding
     backend produced its vectors.

  Vectors + metadata persist to a JSON file, loaded into memory at startup.
  Fine for a demo corpus; a real production system would use pgvector or a
  managed vector DB instead of a hand-rolled in-memory index.

  SECURITY NOTE: search() over-fetches then filters by ownerId, same as the
  Python version — there's no native per-tenant partitioning in this simple
  index, so the owner filter below is the only thing preventing one
  tenant's results from surfacing in another tenant's search.
*/
import fs from "node:fs";
import path from "node:path";
import { config } from "../core/config.js";

const DIM = 256; // hashed local vectors always have this many dimensions
const DATA_PATH = path.resolve("./data/vector-index.json");

interface IndexEntry {
  caseId: string;
  ownerId: string;
  title: string;
  vector: number[];
}

let index: IndexEntry[] = [];

function load(): void {
  if (fs.existsSync(DATA_PATH)) {
    index = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  }
}
load();

function persist(): void {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(index));
}

function hashToken(token: string): number {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h % DIM;
}

function embedLocal(text: string): number[] {
  const vec = new Array(DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    vec[hashToken(token)] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

async function embedOpenAI(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings request failed: ${res.status}`);
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

async function embed(text: string): Promise<number[]> {
  if (config.embeddingProvider === "openai") {
    if (!config.openaiApiKey) {
      throw new Error("EMBEDDING_PROVIDER=openai requires OPENAI_API_KEY to be set");
    }
    return embedOpenAI(text);
  }
  return embedLocal(text);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already L2-normalized, so dot product == cosine similarity
}

export async function indexCase(
  caseId: string,
  ownerId: string,
  title: string,
  bodyText: string
): Promise<void> {
  const vector = await embed(`${title}\n${bodyText}`);
  index.push({ caseId, ownerId, title, vector });
  persist();
}

export async function search(
  query: string,
  ownerId: string,
  topK: number = 5
): Promise<Array<{ caseId: string; title: string; score: number }>> {
  if (index.length === 0) return [];
  const queryVec = await embed(query);

  const scored = index
    .filter((entry) => entry.ownerId === ownerId)
    .map((entry) => ({
      caseId: entry.caseId,
      title: entry.title,
      score: cosineSimilarity(queryVec, entry.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}
