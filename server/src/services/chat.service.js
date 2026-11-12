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

// Turns an AI error into a short message the user can understand
function friendlyError(error) {
  const status = error.statusCode;
  if (status === 429) return 'The AI is very busy right now. Please wait a few seconds and try again.';
  if (status >= 500) return 'The AI service is having problems. Please try again soon.';
  return 'Something went wrong with the AI. Please try again.';
}

// Runs one chat request and returns a UI message stream
export async function startChat(chatId, messages) {
  const startTime = Date.now();
  const lastMessage = messages[messages.length - 1];
  const userText = getText(lastMessage);

  // Save the user message and look for older messages at the same time
  const saveJob = lastMessage.role === 'user' && userText !== ''
    ? saveMessage(chatId, 'user', userText, lastMessage.id)
    : Promise.resolve(null);
  const [userMessage, snippets] = await Promise.all([saveJob, getRecall(chatId, userText)]);

  // Only send the latest messages to keep it fast and cheap
  const recentMessages = messages.slice(-MAX_HISTORY);
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  let firstTokenTime = null;
  let searched = false;

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
    onChunk: ({ chunk }) => {
      if (chunk.type === 'tool-call') searched = true;
      if (chunk.type === 'text-delta' && firstTokenTime === null) {
        firstTokenTime = Date.now() - startTime;
      }
    },
    // After the reply: save it, index it and log. We do not make the user wait for this.
    onFinish: async ({ text }) => {
      const totalTime = Date.now() - startTime;
      console.log(
        'chat ' + chatId.slice(0, 8) +
        ' | first token: ' + firstTokenTime + 'ms' +
        ' | total: ' + totalTime + 'ms' +
        ' | search: ' + (searched ? 'yes' : 'no') +
        ' | recall: ' + (snippets.length > 0 ? 'yes (' + snippets.length + ')' : 'no')
      );
      if (text) await saveMessage(chatId, 'assistant', text);
      if (userMessage) indexMessage(userMessage);
    },
  });

  const modelStream = toUIMessageStream({
    stream: result.stream,
    tools: tools,
    sendStart: false,
    onError: friendlyError,
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
