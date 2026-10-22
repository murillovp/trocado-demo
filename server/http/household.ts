import type { NextFunction, Request, Response } from 'express';
import type { Db } from '../db/client';

declare module 'express-serve-static-core' {
  interface Request {
    householdId: string;
    db: Db;
  }
}

/**
 * Local mode runs as one fixed household. When Trocado is hosted, this is the
 * only function that changes: it reads the session and sets the household from
 * it. Every route already reads `request.householdId`, so nothing else moves.
 */
export function withHousehold(db: Db, householdId: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    request.db = db;
    request.householdId = householdId;
    next();
  };
}
