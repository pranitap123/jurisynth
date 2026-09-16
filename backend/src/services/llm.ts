/*
  This is the actual LLM integration. Three tiers, checked in order:

  1. Groq (if GROQ_API_KEY set) — genuinely free, no credit card, an
     OpenAI-compatible endpoint running Llama 3.3 70B on their LPU
     hardware. This is the recommended path if you don't want to pay.
  2. OpenAI (if OPENAI_API_KEY set) — used if Groq isn't configured.
     Requires billing on the OpenAI account (no free trial credit as of
     when this was written).
  3. Extractive fallback — no API key at all. Weaker, but the feature
     still works end to end rather than failing.

  Both real providers are grounded in the case's own text (a minimal RAG
  pattern: the "retrieval" is just the one case's full text, since these
  are short filings; for a large corpus you'd chunk and retrieve only the
  relevant passages first).
*/
import { config } from "../core/config.js";

interface SummaryResult {
  summary: string;
  keyIssues: string[];
  mode: "llm" | "fallback";
}

interface AnswerResult {
  answer: string;
  mode: "llm" | "fallback";
}

async function callChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

// Picks whichever provider is configured — Groq first (it's free), then
// OpenAI. Returns null if neither is set, meaning: use the fallback.
function activeProvider(): { baseUrl: string; apiKey: string; model: string } | null {
  if (config.groqApiKey) {
    return {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: config.groqApiKey,
      // Groq decommissioned llama-3.3-70b-versatile on 2026-08-16 and
      // recommends this as the direct replacement. If this 404s again in
      // the future, check https://console.groq.com/docs/deprecations for
      // whatever they've moved it to next.
      model: "openai/gpt-oss-120b",
    };
  }
  if (config.openaiApiKey) {
    return {
      baseUrl: "https://api.openai.com/v1",
      apiKey: config.openaiApiKey,
      model: "gpt-4o-mini",
    };
  }
  return null;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// --- fallback: no LLM available ---

function fallbackSummary(title: string, bodyText: string): SummaryResult {
  const sentences = splitSentences(bodyText);
  const summary = sentences.slice(0, 3).join(" ") || bodyText.slice(0, 280);
  // naive key-issue extraction: sentences containing common legal signal words
  const signalWords = ["breach", "negligence", "liability", "damages", "violat", "fail", "duty", "contract"];
  const keyIssues = sentences
    .filter((s) => signalWords.some((w) => s.toLowerCase().includes(w)))
    .slice(0, 3);
  return {
    summary: `${summary} (Extractive summary — no LLM configured. Set OPENAI_API_KEY for a real generated summary.)`,
    keyIssues: keyIssues.length ? keyIssues : ["No LLM configured — set OPENAI_API_KEY for real issue extraction."],
    mode: "fallback",
  };
}

function fallbackAnswer(question: string, bodyText: string): AnswerResult {
  const sentences = splitSentences(bodyText);
  const questionWords = question.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const scored = sentences
    .map((s) => ({
      sentence: s,
      score: questionWords.filter((w) => s.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const answer =
    best && best.score > 0
      ? best.sentence
      : "No LLM configured, and no sentence in this case text obviously matches your question. Set OPENAI_API_KEY for real question-answering.";
  return { answer, mode: "fallback" };
}

// --- public API ---

export async function summarizeCase(title: string, bodyText: string): Promise<SummaryResult> {
  const provider = activeProvider();
  if (!provider) {
    return fallbackSummary(title, bodyText);
  }

  const raw = await callChatCompletion(
    provider.baseUrl,
    provider.apiKey,
    provider.model,
    "You summarize legal case filings for a lawyer. Respond ONLY as JSON: " +
      '{"summary": "2-3 sentence plain-language summary", "key_issues": ["issue 1", "issue 2", "issue 3"]}. ' +
      "Base this ONLY on the text given — never invent facts, parties, or outcomes not present in the text.",
    `Case title: ${title}\n\nCase text:\n${bodyText}`
  );

  try {
    const parsed = JSON.parse(raw);
    return { summary: parsed.summary, keyIssues: parsed.key_issues ?? [], mode: "llm" };
  } catch {
    // Model didn't return valid JSON — degrade gracefully rather than 500ing.
    return { summary: raw, keyIssues: [], mode: "llm" };
  }
}

export async function answerQuestion(question: string, bodyText: string): Promise<AnswerResult> {
  const provider = activeProvider();
  if (!provider) {
    return fallbackAnswer(question, bodyText);
  }

  const answer = await callChatCompletion(
    provider.baseUrl,
    provider.apiKey,
    provider.model,
    "You answer questions about a legal case using ONLY the case text provided. " +
      "If the text doesn't contain the answer, say so plainly — never guess or invent facts.",
    `Case text:\n${bodyText}\n\nQuestion: ${question}`
  );
  return { answer, mode: "llm" };
}