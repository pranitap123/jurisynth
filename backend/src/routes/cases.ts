/*
  DATA ISOLATION: every query filters by ownerId === req.user.id. There is
  no other isolation mechanism — it's enforced by discipline in every
  query, same as the Python version. This is a real IDOR (Insecure Direct
  Object Reference) risk class: if you add an endpoint later and forget
  this filter, a user could read or modify another user's cases by
  guessing a UUID. Check this before shipping any new route.
*/
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../core/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import * as retrieval from "../services/retrieval.js";
import * as graph from "../services/graph.js";
import * as llm from "../services/llm.js";

export const casesRouter = Router();
casesRouter.use(requireAuth);

const createCaseSchema = z.object({
  title: z.string().min(1),
  body_text: z.string().min(1),
});

casesRouter.post("/", async (req, res) => {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }
  const { title, body_text } = parsed.data;

  const kase = await prisma.case.create({
    data: { ownerId: req.user!.id, title, bodyText: body_text },
  });

  // Best-effort side indexes. If Neo4j or the vector store were down, the
  // case is still safely in Postgres (the source of truth). Real production
  // would retry these via a background queue instead of failing silently.
  await Promise.all([
    retrieval.indexCase(kase.id, req.user!.id, kase.title, kase.bodyText),
    graph.createCaseNode(kase.id, kase.title),
  ]);

  res.status(201).json({ id: kase.id, title: kase.title });
});

casesRouter.get("/", async (req, res) => {
  const cases = await prisma.case.findMany({
    where: { ownerId: req.user!.id },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(cases);
});

casesRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const topK = Number(req.query.top_k ?? 5);
  const results = await retrieval.search(q, req.user!.id, topK);
  res.json(results.map((r) => ({ case_id: r.caseId, title: r.title, score: r.score })));
});

casesRouter.post("/:caseId/link/:relatedCaseId", async (req, res) => {
  const { caseId, relatedCaseId } = req.params;
  const relationship = String(req.query.relationship ?? "CITES");

  // Ownership check BEFORE touching the graph — otherwise a user could
  // link cases they don't own by guessing UUIDs.
  const owned = await prisma.case.findMany({
    where: { ownerId: req.user!.id, id: { in: [caseId, relatedCaseId] } },
    select: { id: true },
  });
  if (owned.length !== 2) {
    return res.status(404).json({ detail: "Case not found" });
  }

  try {
    await graph.linkCases(caseId, relatedCaseId, relationship);
    res.json({ linked: true });
  } catch (err) {
    res.status(422).json({ detail: (err as Error).message });
  }
});

casesRouter.get("/:caseId/related", async (req, res) => {
  const { caseId } = req.params;
  const maxHops = Number(req.query.max_hops ?? 2);

  const kase = await prisma.case.findFirst({
    where: { id: caseId, ownerId: req.user!.id },
  });
  if (!kase) {
    return res.status(404).json({ detail: "Case not found" });
  }

  const related = await graph.findRelatedCases(caseId, maxHops);
  res.json(related);
});

casesRouter.post("/:caseId/summarize", async (req, res) => {
  const kase = await prisma.case.findFirst({
    where: { id: req.params.caseId, ownerId: req.user!.id },
  });
  if (!kase) {
    return res.status(404).json({ detail: "Case not found" });
  }

  try {
    const result = await llm.summarizeCase(kase.title, kase.bodyText);
    res.json({ summary: result.summary, key_issues: result.keyIssues, mode: result.mode });
  } catch (err) {
    res.status(502).json({ detail: `Summarization failed: ${(err as Error).message}` });
  }
});

const askSchema = z.object({ question: z.string().min(1) });

casesRouter.post("/:caseId/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }

  const kase = await prisma.case.findFirst({
    where: { id: req.params.caseId, ownerId: req.user!.id },
  });
  if (!kase) {
    return res.status(404).json({ detail: "Case not found" });
  }

  try {
    const result = await llm.answerQuestion(parsed.data.question, kase.bodyText);
    res.json({ answer: result.answer, mode: result.mode });
  } catch (err) {
    res.status(502).json({ detail: `Question answering failed: ${(err as Error).message}` });
  }
});
