import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ data: { status: 'ok', timestamp: Date.now() }, error: null });
});
