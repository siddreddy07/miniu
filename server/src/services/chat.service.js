import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStream,
  isStepCount,
} from 'ai';
import { model, MAX_HISTORY, MAX_OUTPUT_TOKENS, MAX_TOOL_CALLS } from '../config/ai.js';
import { buildSystemPrompt } from './prompt.service.js';
import { createUser, createChat, checkChat, saveMessage, indexMessage } from './memory.service.js';
import { getRecall, wantsRecall, wantsFresh } from './recall.service.js';
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

export async function startChat(userId, chatId, messages, timezone) {
  const startTime = Date.now();
  const lastMessage = messages[messages.length - 1];
  const userText = getText(lastMessage);

  // 1. Make sure the user and the chat exist, then save the user message
  await createUser(userId);
  await createChat(userId, chatId, userText);

  // The chat id comes from the URL, so check the chat really belongs to this user
  const chatInfo = await checkChat(userId, chatId);
  if (!chatInfo.ok) {
    const error = new Error('This chat belongs to someone else');
    error.statusCode = 403;
    throw error;
  }

  const userMessage = await saveMessage(userId, chatId, 'user', userText, lastMessage.id);
  // When the chat was first created (used in the Pinecone vector id)
  userMessage.chatCreatedAt = chatInfo.createdAt || userMessage.createdAt;

  // Only the latest messages go to the model, to keep it fast
  const recentMessages = messages.slice(-MAX_HISTORY);

  // 2. Find older messages of this user, but not the ones the model already sees
  const recentTexts = recentMessages.map(getText);
  const snippets = await getRecall(userId, chatId, userText, recentTexts, timezone);

  // 3. Ask the model
  const modelMessages = await convertToModelMessages(recentMessages, { tools: tools });

  // For a question about the past, the model answers from memory and does not search
  // If the user also asks "any updates?", the search stays on to check what is true now
  const wantsPast = wantsRecall(userText, timezone);
  const askingAboutPast = wantsPast && !wantsFresh(userText);
  const askingBoth = wantsPast && wantsFresh(userText);
  const systemPrompt = buildSystemPrompt(snippets, askingAboutPast, askingBoth);

  // The web search result of this answer, saved so the source badges survive a reload
  let search = null;

  const result = streamText({
    model: model,
    system: systemPrompt,
    messages: modelMessages,
    tools: tools,
    // For a question about the past, no tool is allowed
    activeTools: askingAboutPast ? [] : undefined,
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
    onChunk: ({ chunk }) => {
      if (chunk.type === 'tool-result' && chunk.toolName === 'webSearch' && chunk.output.results) {
        search = chunk.output;
      }
    },
    // 4. When the reply is done: save it and index the question
    onFinish: async ({ text }) => {
      console.log('Chat done in ' + (Date.now() - startTime) + 'ms, memory used: ' + snippets.length);
      // If the AI failed, the text is empty and there is nothing to save
      if (text) await saveMessage(userId, chatId, 'assistant', text, null, search);
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
