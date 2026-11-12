import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStream,
  isStepCount,
} from 'ai';
import { model, MAX_HISTORY, MAX_OUTPUT_TOKENS, MAX_TOOL_CALLS } from '../config/ai.js';
import { buildSystemPrompt } from './prompt.service.js';
import { createUser, createChat, saveMessage, indexMessage } from './memory.service.js';
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

// Added to the prompt on the last step
const FINAL_STEP_NOTE = '\n\nNow write the final answer from what you have. Do not call any tool.';

// Shows a simple message to the user when the AI fails
function getErrorMessage(error) {
  console.log('AI error:', error.statusCode, error.message);
  if (error.statusCode === 429) {
    return 'The AI is busy right now. Please try again in a few seconds.';
  }
  return 'The AI had a problem. Please try again.';
}

export async function startChat(userId, chatId, messages) {
  const startTime = Date.now();
  const lastMessage = messages[messages.length - 1];
  const userText = getText(lastMessage);

  // 1. Make sure the user and the chat exist, then save the user message
  await createUser(userId);
  await createChat(userId, chatId, userText);
  const userMessage = await saveMessage(userId, chatId, 'user', userText, lastMessage.id);

  // 2. Find older messages from other chats
  const snippets = await getRecall(userId, chatId, userText);

  // 3. Ask the model (only the latest messages, to keep it fast)
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  const systemPrompt = buildSystemPrompt(snippets);

  const result = streamText({
    model: model,
    system: systemPrompt,
    messages: modelMessages,
    tools: tools,
    stopWhen: isStepCount(MAX_TOOL_CALLS + 1),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // Think a little, and keep the thinking out of the answer
    providerOptions: { groq: { reasoningFormat: 'parsed', reasoningEffort: 'low' } },
    // After the last allowed tool call, we remove the tool so the model must write an answer
    prepareStep: ({ stepNumber }) => {
      if (stepNumber >= MAX_TOOL_CALLS) {
        return { activeTools: [], system: systemPrompt + FINAL_STEP_NOTE };
      }
      return {};
    },
    // 4. When the reply is done: save it and index the question
    onFinish: async ({ text }) => {
      console.log('Chat done in ' + (Date.now() - startTime) + 'ms, memory used: ' + snippets.length);
      await saveMessage(userId, chatId, 'assistant', text);
      indexMessage(userMessage);
    },
  });

  const modelStream = toUIMessageStream({
    stream: result.stream,
    tools: tools,
    sendStart: false,
    sendReasoning: false,
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
