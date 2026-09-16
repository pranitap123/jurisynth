import { PrismaClient } from "@prisma/client";

// A single shared client, not one per request — Prisma manages its own
// connection pool internally, so creating a new client per request would
// exhaust Postgres connections under load instead of reusing them.
export const prisma = new PrismaClient();
