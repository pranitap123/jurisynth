# Jurisynth AI — Frontend

React + Vite frontend for the Jurisynth backend: auth (with TOTP MFA
enrollment), case management, FAISS semantic search, XGBoost risk scoring,
and Neo4j citation traversal — each screen calls the real backend endpoint,
nothing here is mocked.

## Design decisions (so you can defend them)

- **Visual concept**: "the case file, digitized" — deep ink background,
  a serif (Source Serif 4) for headlines paired with a sans (IBM Plex Sans)
  for UI, and a muted brass accent instead of a generic gradient. Chosen
  deliberately to avoid the common AI-generated-page look (warm cream +
  terracotta, or near-black + neon accent, or identical rounded SaaS cards).
- **The hero visual is not decorative** — it's a fanned stack of case-file
  pages with the citation graph (Three.js) floating above them, connected
  by faint extraction threads: a literal visual of "documents in, graph
  out," not an abstract shape. It converges into formation once on load
  (the app's one deliberate motion moment), then settles into ambient
  rotation plus cursor-parallax. `prefers-reduced-motion` is respected —
  the animation is skipped entirely and the scene renders in its final
  position.
- **Case summarization and Q&A are real LLM features**, each showing a
  visible "LLM" or "fallback" badge depending on whether `OPENAI_API_KEY`
  is set on the backend — never presented as a model output when it's
  actually the extractive fallback.
- **MFA QR code is generated client-side** with the `qrcode` package, not
  via a public "QR generator" API — sending a TOTP secret to a third-party
  server would defeat the purpose of the secret.
- **Login is two-step**: password first; a second TOTP prompt only appears
  if the backend reports this account has MFA enabled. This matches how
  real MFA flows work — password-only accounts are never asked for a code
  that doesn't exist.

## Local setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your running backend
npm run dev
```

Requires the backend running (see the backend README) — this frontend
makes real API calls, there's no mock data mode.

## What's NOT built yet (be upfront about this)

- No loading skeletons / optimistic UI — network calls show a simple
  "…" label, not polished skeleton states
- No toast/notification system — errors render inline per-form only
- No pagination on the cases list (fine for a demo corpus, not for scale)
- No code-splitting yet — the build reports a single ~780kB JS bundle;
  a real next step would be lazy-loading the Three.js hero and routes

## Suggested commit sequence

```
feat: scaffold Vite + React project with routing
feat: add design tokens and global styles
feat: add auth context and API client
feat: build landing page with three.js citation-graph hero
feat: implement signup and two-step MFA login flow
feat: add client-side TOTP QR enrollment
feat: build cases dashboard with create + related-case traversal
feat: add semantic search screen
feat: add risk scoring screen
docs: document design rationale and known gaps
```
