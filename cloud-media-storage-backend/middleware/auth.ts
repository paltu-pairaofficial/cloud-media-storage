import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User } from '../db.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || 'cloud-media-storage-jwt-secret-key-2026';

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = await db.getUserById(payload.id);
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }
}

export async function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      const user = await db.getUserById(payload.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // ignore
    }
  }
  next();
}
