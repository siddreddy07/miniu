import { Router } from 'express';
import {
  chatController,
  listChatsController,
  chatMessagesController,
} from '../controllers/chat.controller.js';

export const chatRouter = Router();

chatRouter.get('/health', (req, res) => {
  res.json({ ok: true });
});

chatRouter.post('/api/chat', chatController);
chatRouter.get('/api/chats', listChatsController);
chatRouter.post('/api/chats/:chatId/messages', chatMessagesController);
