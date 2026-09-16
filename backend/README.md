# Jurisynth AI — Backend (Node / Express / TypeScript)

Rebuilt from the Python/FastAPI version to match your actual primary
stack and to fix the slow Docker build — this has **zero native compiled
dependencies** (no PyTorch, no FAISS, no XGBoost), so `npm install` and
startup are fast.

## What changed vs. the Python version, and why

| Concern | Python version | This version | Why |
|---|---|---|---|
| Semantic search | FAISS + sentence-transformers | Hand-rolled feature-hashed vectors (pure JS), swappable to real OpenAI embeddings | FAISS/transformers = huge downloads + native build. Local mode needs neither; OpenAI mode is a one-line env change when you want real embedding quality |
| Risk model | XGBoost | Logistic regression, hand-written gradient descent | XGBoost's Node bindings are also natively compiled. Logistic regression is weaker at feature interactions but is a real, from-scratch, fully-understood pipeline |
| Password hashing | bcrypt (Python) | **bcryptjs**, not `bcrypt` | `bcrypt` for Node needs node-gyp + a C++ toolchain — the single most common cause of slow/broken Docker builds. bcryptjs is pure JS, slightly slower per hash, fine for login-rate operations |
| Auth, TOTP MFA, Postgres schema, Neo4j graph, per-user isolation | ✅ | ✅ same design, same guarantees | These weren't the slow part — same architecture, ported faithfully |

**Read this before an interview**: the search quality tradeoff is real —
feature-hashed bag-of-words won't understand "landlord" and "lessor" mean
the same thing the way a transformer embedding would. Say that plainly if
asked. Set `EMBEDDING_PROVIDER=openai` with an API key when you want real
embedding-quality search; the rest of the app doesn't change, because both
backends implement the same `embed()` shape — that interchangeability is
the actual design point worth mentioning.

## Local setup (fast path — no Docker for the API itself)

```bash
# 1. Start just the infra (Postgres, Neo4j, Redis) in Docker
docker compose up -d postgres neo4j redis

# 2. Install deps (pure JS, should take seconds not minutes)
npm install

# 3. Configure environment
cp .env.example .env
# edit JWT_SECRET at minimum

# 4. Set up the database schema
npx prisma generate
npx prisma migrate dev --name init

# 5. Train the risk model (produces ml/risk-model.json)
npm run train:risk

# 6. Run the API
npm run dev
```

API listens on `http://localhost:8000`.

## Endpoints (identical shape to the Python version — frontend needs no changes)

- `POST /auth/signup`, `POST /auth/login`
- `POST /auth/mfa/enroll`, `POST /auth/mfa/verify`
- `POST /cases`, `GET /cases`, `GET /cases/search?q=...`
- `POST /cases/:caseId/link/:relatedCaseId`, `GET /cases/:caseId/related`
- `POST /cases/:caseId/summarize` — plain-language summary + key issues
- `POST /cases/:caseId/ask` — Q&A grounded in that case's own text
- `POST /risk/score`

Your existing frontend (`jurisynth-frontend`) points at this via
`VITE_API_URL` and needs no code changes — request/response shapes match.

## LLM features (summarization + Q&A) — read this before demoing it

`/cases/:id/summarize` and `/cases/:id/ask` check for a provider in this order:

1. **Groq** (`GROQ_API_KEY`) — genuinely free, no credit card. Sign up at
   https://console.groq.com/keys, running Llama 3.3 70B on an
   OpenAI-compatible endpoint. **This is the recommended path** — OpenAI
   no longer gives free trial credit and requires billing to be set up.
2. **OpenAI** (`OPENAI_API_KEY`) — used only if Groq isn't set.
3. **Extractive fallback** — no key at all. Weaker (first few sentences
   for summary, keyword-sentence matching for Q&A), but the feature still
   works end to end instead of failing.

Both real providers are grounded only in that one case's stored text — the
prompt explicitly tells the model not to invent facts not present in the
text. Every response includes a `mode: "llm" | "fallback"` field, shown as
a badge in the frontend. Never present a fallback result as if it came
from the model — the badge exists specifically so you don't have to
remember to caveat this out loud.

## What's NOT built yet (be upfront about this)

- No refresh tokens / token revocation
- No rate limiting on auth endpoints (brute-force protection not implemented)
- Redis is running in the stack but not yet used by any endpoint
- No automated tests
- Local embeddings are a real but simple technique (feature hashing), not
  an LLM — don't call this "AI-powered search" without the OpenAI mode enabled

## Suggested commit sequence

```
feat: scaffold Express + TypeScript project with Prisma
feat: add Prisma schema for User, Case, RiskAssessment
feat: implement JWT auth (signup/login)
feat: add TOTP MFA enrollment and verification
feat: add per-user case CRUD with ownership isolation
feat: implement hashed-vector semantic search with optional OpenAI embeddings
feat: integrate Neo4j for case citation graph traversal
feat: train and serve logistic regression risk model
chore: add docker-compose for postgres/neo4j/redis infra
docs: document architecture decisions, tradeoffs vs Python version, and known limitations
```