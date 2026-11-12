import { Router } from 'express';

export const chatRouter = Router();

chatRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});
