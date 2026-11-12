import { streamText, convertToModelMessages, toUIMessageStream, isStepCount } from 'ai';
import { model, MAX_HISTORY, MAX_OUTPUT_TOKENS, MAX_STEPS } from '../config/ai.js';
import { buildSystemPrompt } from './prompt.service.js';
import { webSearch } from '../tools/webSearch.tool.js';

const tools = { webSearch: webSearch };

// Starts the model and returns a UI message stream
export async function startChat(messages) {
  // Only send the latest messages to keep it fast and cheap
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  const result = streamText({
    model: model,
    system: buildSystemPrompt(),
    messages: modelMessages,
    tools: tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // On the last step we turn the tool off, so the model must write an answer
    prepareStep: ({ stepNumber }) => {
      if (stepNumber >= MAX_STEPS - 1) {
        return { toolChoice: 'none' };
      }
      return {};
    },
  });

  return toUIMessageStream({
    stream: result.stream,
    tools: tools,
    onError: () => 'The AI service had a problem. Please try again.',
  });
}
