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
  for (const part of message.parts) {
    if (part.type === 'text') text = text + part.text;
  }
  return text;
}

// Shows a simple message to the user when the AI fails
function getErrorMessage(error) {
  if (error.statusCode === 429) {
    return 'The AI is busy right now. Please try again in a few seconds.';
  }
  return 'The AI had a problem. Please try again.';
}

export async function startChat(chatId, messages) {
  const startTime = Date.now();
  const lastMessage = messages[messages.length - 1];
  const userText = getText(lastMessage);

  // 1. Save the user message
  const userMessage = await saveMessage(chatId, 'user', userText, lastMessage.id);

  // 2. Find older messages from other chats
  const snippets = await getRecall(chatId, userText);

  // 3. Ask the model (only the latest messages, to keep it fast)
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  const result = streamText({
    model: model,
    system: buildSystemPrompt(snippets),
    messages: modelMessages,
    tools: tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // On the last step the tool is turned off, so the model must write an answer
    prepareStep: ({ stepNumber }) => {
      if (stepNumber >= MAX_STEPS - 1) return { toolChoice: 'none' };
      return {};
    },
    // 4. When the reply is done: save it and index the question
    onFinish: async ({ text }) => {
      console.log('Chat done in ' + (Date.now() - startTime) + 'ms, memory used: ' + snippets.length);
      await saveMessage(chatId, 'assistant', text);
      indexMessage(userMessage);
    },
  });

  const modelStream = toUIMessageStream({
    stream: result.stream,
    tools: tools,
    sendStart: false,
    onError: getErrorMessage,
  });

  return createUIMessageStream({
    execute: ({ writer }) => {
      // "start" must come first or the browser ignores the memory part
      writer.write({ type: 'start' });
      if (snippets.length > 0) {
        writer.write({ type: 'data-memory', data: snippets });
      }
      writer.merge(modelStream);
    },
  });
}
