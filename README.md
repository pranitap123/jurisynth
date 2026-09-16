# Jurisynth AI

Legal intelligence platform with LLM-powered case summarization, Q&A, and citation graph analysis.

## Quick Start

### Backend
```bash
cd backend
docker compose up -d postgres neo4j redis
npx prisma migrate dev --name init
npm run train:risk
npm run dev
```

### Frontend
```bash
cd frontend
npm install
echo 'VITE_API_URL=http://localhost:8000' > .env
npm run dev
```

## Features
- Case management with ownership isolation
- Semantic search with optional OpenAI embeddings
- LLM summarization and Q&A (Groq free tier)
- Citation graph traversal (Neo4j)
- Risk scoring with logistic regression
- JWT auth + TOTP MFA

## Tech Stack
**Backend:** Node.js, Express, TypeScript, Prisma, Neo4j, PostgreSQL, Redis
**Frontend:** React, Vite, Three.js, Framer Motion

## Status
Portfolio project. Not production-ready.
