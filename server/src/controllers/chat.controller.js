import { z } from 'zod';
import { pipeUIMessageStreamToResponse } from 'ai';
import { startChat } from '../services/chat.service.js';

const bodySchema = z.object({
  id: z.string(),
  messages: z.array(z.any()).min(1),
});

export async function chatController(req, res) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const stream = await startChat(parsed.data.messages);
    await pipeUIMessageStreamToResponse({ response: res, stream: stream });
  } catch (error) {
    console.log('Chat error:', error.message);
    res.status(500).json({ error: 'Could not start the chat' });
  }
}
