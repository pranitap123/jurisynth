import type { Request, Response, NextFunction } from "express";
import { decodeAccessToken } from "../core/security.js";
import { prisma } from "../core/prisma.js";

// Express doesn't know about `req.user` by default — this augments the
// type so route handlers get autocomplete/type-checking on it.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);
  const payload = decodeAccessToken(token);
  if (!payload) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return res.status(401).json({ detail: "User no longer exists" });
  }

  req.user = { id: user.id, email: user.email };
  next();
}
