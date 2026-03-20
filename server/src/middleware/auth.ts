import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

interface JwtPayload {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session as string | undefined;

  if (!token) {
    res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      photoURL: payload.photoURL,
      isGuest: payload.isGuest,
    };
    next();
  } catch {
    res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
  }
}
