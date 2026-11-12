import { z } from 'zod';
import { pipeUIMessageStreamToResponse } from 'ai';
import { startChat } from '../services/chat.service.js';
import { getChats, getConversation } from '../services/memory.service.js';

const userBodySchema = z.object({
  userId: z.string().min(1),
});

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
    if (error.statusCode === 403) {
      return res.status(403).json({ error: 'This chat belongs to someone else' });
    }
    res.status(500).json({ error: 'Could not start the chat' });
  }
}

// GET /api/chats - the list for the sidebar
export async function listChatsController(req, res) {
  const chats = await getChats(req.query.userId);
  res.json({ chats: chats });
}

// POST /api/chats/:chatId/messages - all messages of one conversation
// The chat id is in the URL. The user id is in the body (the browser sends it from localStorage).
export async function chatMessagesController(req, res) {
  const parsed = userBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const conversation = await getConversation(parsed.data.userId, req.params.chatId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.log('Could not load conversation:', error.message);
    res.status(500).json({ error: 'Could not load the conversation' });
  }
}
