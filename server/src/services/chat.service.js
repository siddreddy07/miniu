import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStream,
  isStepCount,
} from 'ai';
import { model, MAX_HISTORY, MAX_OUTPUT_TOKENS, MAX_STEPS } from '../config/ai.js';
import { buildSystemPrompt } from './prompt.service.js';
import { saveMessage, indexMessage } from './memory.service.js';
import { getRecall } from './recall.service.js';
import { tools } from '../tools/tool.js';

// Gets the plain text of a message
function getText(message) {
  let text = '';
  for (const part of message.parts || []) {
    if (part.type === 'text') text = text + part.text;
  }
  return text;
}

// Runs one chat request and returns a UI message stream
export async function startChat(chatId, messages) {
  const lastMessage = messages[messages.length - 1];
  const userText = getText(lastMessage);

  // 1. Save the user message
  let userMessage = null;
  if (lastMessage.role === 'user' && userText !== '') {
    userMessage = await saveMessage(chatId, 'user', userText, lastMessage.id);
  }

  // 2. Look for older messages that can help
  const snippets = await getRecall(chatId, userText);

  // 3. Ask the model. Only send the latest messages to keep it fast and cheap.
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  const result = streamText({
    model: model,
    system: buildSystemPrompt(snippets),
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
    // 4. After the reply: save it and index it. We do not wait for this.
    onFinish: async ({ text }) => {
      if (text) await saveMessage(chatId, 'assistant', text);
      if (userMessage) indexMessage(userMessage);
    },
  });

  const modelStream = toUIMessageStream({
    stream: result.stream,
    tools: tools,
    sendStart: false,
    onError: () => 'The AI service had a problem. Please try again.',
  });

  // Send the memory snippets first (only if we used some), then the model stream
  return createUIMessageStream({
    execute: ({ writer }) => {
      // The start chunk must come first, or the browser ignores the memory part
      writer.write({ type: 'start' });
      if (snippets.length > 0) {
        writer.write({ type: 'data-memory', data: snippets });
      }
      writer.merge(modelStream);
    },
  });
}
