import { z } from 'zod';
import { pipeUIMessageStreamToResponse } from 'ai';
import { startChat } from '../services/chat.service.js';
import { getChats, getChatMessages } from '../services/memory.service.js';

const bodySchema = z.object({
  id: z.string(),
  userId: z.string().min(1),
  messages: z.array(z.any()).min(1),
});

// POST /api/chat - answer one message
export async function chatController(req, res) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const stream = await startChat(parsed.data.userId, parsed.data.id, parsed.data.messages);
    await pipeUIMessageStreamToResponse({ response: res, stream: stream });
  } catch (error) {
    console.log('Chat error:', error.message);
    res.status(500).json({ error: 'Could not start the chat' });
  }
}

// GET /api/chats - the list for the sidebar
export async function listChatsController(req, res) {
  const chats = await getChats(req.query.userId);
  res.json({ chats: chats });
}

// GET /api/chats/:id/messages - all messages of one chat
export async function chatMessagesController(req, res) {
  const messages = await getChatMessages(req.query.userId, req.params.id);
  res.json({ messages: messages });
}
