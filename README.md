# Jurisynth AI

A legal intelligence platform that reads case filings and turns them into something a lawyer can actually use: plain-language summaries, direct Q&A grounded in the case text, a citation graph, semantic search, and an automated risk score.

## Features

- **Case summarization & Q&A** — LLM-generated summaries and key-issue extraction, plus direct question answering restricted to that case's own text (no hallucinated facts). Runs on Groq (free) or OpenAI, with a working extractive fallback if neither is configured.
- **Citation graph** — cases are stored as nodes in Neo4j, connected by `CITES` / `RELATED_TO` / `OVERRULES` edges; traverse outward to see what a ruling depends on.
- **Semantic search** — feature-hashed vector search by default, swappable to real embeddings via one environment variable.
- **Risk scoring** — a logistic regression model (trained from scratch, no external ML library) scores case risk from a small set of features.
- **Auth** — JWT-based signup/login with TOTP two-factor authentication.
- **Per-user isolation** — every case is scoped to its owner; no cross-account data access.

## Tech stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Neo4j, Redis
**Frontend:** React, Vite, Three.js, Framer Motion
**LLM:** Groq (Llama/GPT-OSS) or OpenAI, both OpenAI-compatible chat completions

## Quick start

### Backend

```bash
cd backend
docker compose up -d postgres neo4j redis
npx prisma generate
npx prisma migrate dev --name init
npm run train:risk
npm run dev
```

Create `backend/.env` from `backend/.env.example` — see that file for the database URLs and the free Groq API key setup.

Runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Runs on `http://localhost:5173`.

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | JWT auth |
| POST | `/auth/mfa/enroll`, `/auth/mfa/verify` | TOTP setup |
| GET/POST | `/cases` | List / create cases |
| GET | `/cases/search?q=...` | Semantic search |
| POST | `/cases/:id/link/:relatedId` | Link two cases in the citation graph |
| GET | `/cases/:id/related` | Traverse the citation graph |
| POST | `/cases/:id/summarize` | LLM summary + key issues |
| POST | `/cases/:id/ask` | Q&A grounded in the case text |
| POST | `/risk/score` | Risk score for a case |

Full details, including honest notes on what's simplified vs. production-grade, are in `backend/README.md` and `frontend/README.md`.

## What's simplified (by design, for a portfolio-scale project)

- Local embeddings are feature hashing, not a trained model, unless `EMBEDDING_PROVIDER=openai` is set
- Risk model is trained on synthetic data
- No refresh tokens, rate limiting, or automated tests yet
- Redis is provisioned but not yet wired to a caching path

See each subproject's README for the full, specific list.

## License

MIT
