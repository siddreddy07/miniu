import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';

export const chatRouter = Router();

chatRouter.get('/health', (req, res) => {
  res.json({ ok: true });
});

chatRouter.post('/api/chat', chatController);
