import { Request, Response, NextFunction, RequestHandler } from "express";

/*
  Express 4 does NOT automatically catch errors thrown inside an async
  route handler — a rejected promise with nothing awaiting it becomes an
  unhandled promise rejection, and Node's default behavior (since Node 15)
  is to crash the whole process on that. In production terms: one bad
  database call in one request took down every user's session, not just
  the request that failed. This was the real cause of the Neo4j-triggered
  502s — Neo4j being unreachable was just the trigger, not the bug.

  This wrapper catches whatever an async handler throws/rejects and hands
  it to next(err), which routes it to the centralized error handler in
  app.ts (a clean JSON 500) instead of killing the server. (Express 5 does
  this automatically; upgrading is a bigger migration, so this is the
  fix that doesn't require changing frameworks.)
*/
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}