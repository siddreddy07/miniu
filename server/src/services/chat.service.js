import { streamText, convertToModelMessages, toUIMessageStream } from 'ai';
import { model, MAX_HISTORY, MAX_OUTPUT_TOKENS } from '../config/ai.js';
import { buildSystemPrompt } from './prompt.service.js';

// Starts the model and returns a UI message stream
export async function startChat(messages) {
  // Only send the latest messages to keep it fast and cheap
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages);

  const result = streamText({
    model: model,
    system: buildSystemPrompt(),
    messages: modelMessages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return toUIMessageStream({
    stream: result.stream,
    onError: () => 'The AI service had a problem. Please try again.',
  });
}
