import 'express';

declare module 'express' {
  interface Request {
    user?: {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      isGuest: boolean;
    };
  }
}
