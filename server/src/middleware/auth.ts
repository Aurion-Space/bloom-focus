import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config.js';

const JWT_SECRET = getJwtSecret();

export interface GardenTokenPayload {
  garden_id: string;
}

export interface AuthenticatedRequest extends Request {
  gardenId?: string;
}

export function generateToken(garden_id: string): string {
  return jwt.sign({ garden_id }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): GardenTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as GardenTokenPayload;
  } catch {
    return null;
  }
}

export function requireGarden(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  req.gardenId = payload.garden_id;
  next();
}
