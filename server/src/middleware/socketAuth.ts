import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../env';

interface JwtPayload {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const cookieHeader = socket.handshake.headers.cookie;

  if (!cookieHeader) {
    next(new Error('Unauthorized'));
    return;
  }

  const cookies = parseCookies(cookieHeader);
  const token = cookies['session'];

  if (!token) {
    next(new Error('Unauthorized'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    socket.data.user = {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      photoURL: payload.photoURL,
      isGuest: payload.isGuest,
    };
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
}
