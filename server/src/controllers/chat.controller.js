import { z } from 'zod';
import { pipeUIMessageStreamToResponse } from 'ai';
import { startChat } from '../services/chat.service.js';

// What the client must send
const bodySchema = z.object({
  id: z.string().min(1),
  messages: z.array(z.any()).min(1),
});

export async function chatController(req, res) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // If the user closes the page or presses Stop, we cancel the model call
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  try {
    const stream = await startChat(parsed.data.messages, controller.signal);
    await pipeUIMessageStreamToResponse({ response: res, stream: stream });
  } catch (error) {
    console.error('Chat error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not start the chat' });
    } else {
      res.end();
    }
  }
}
