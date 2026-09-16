import "dotenv/config";

/*
  WHY a single config object instead of process.env scattered everywhere:
  one place to see every required value, and a place to add validation
  (e.g. throw at startup if JWT_SECRET is missing) rather than discovering
  it's undefined halfway through a request.
*/
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8000),
  databaseUrl: required("DATABASE_URL", "postgresql://jurisynth:jurisynth@localhost:5432/jurisynth"),

  neo4jUri: process.env.NEO4J_URI ?? "bolt://localhost:7687",
  neo4jUser: process.env.NEO4J_USER ?? "neo4j",
  neo4jPassword: process.env.NEO4J_PASSWORD ?? "jurisynth_graph",

  jwtSecret: required("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30m",

  totpIssuer: process.env.TOTP_ISSUER ?? "JurisynthAI",

  // Embeddings: 'local' needs no API key or native deps (good default —
  // this is what made the Python build slow). Set to 'openai' + provide
  // OPENAI_API_KEY to use real LLM embeddings for meaningfully better
  // semantic search quality once you're ready for that dependency.
  embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? "local") as "local" | "openai",
  openaiApiKey: process.env.OPENAI_API_KEY,

  groqApiKey: process.env.GROQ_API_KEY,

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};