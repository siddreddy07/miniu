import { getUserMessagesFromOtherChats, searchSimilarMessages } from './memory.service.js';
import { RECALL_MAX_TOKENS, RECALL_RECENT_LIMIT, RECALL_SEMANTIC_LIMIT } from '../config/ai.js';

// If the user writes one of these, they are asking about the past
const RECALL_WORDS = ['earlier', 'before', 'last time', 'yesterday', 'did i ask', 'what did i', 'remember'];

function wantsRecall(text) {
  const lowerText = text.toLowerCase();
  for (const word of RECALL_WORDS) {
    if (lowerText.includes(word)) return true;
  }
  return false;
}

// Returns older messages: [{ chatId, role, text, createdAt }]
// recentTexts are the messages the model already sees in this chat, so we skip them.
// Returns [] if there is nothing good to add.
export async function getRecall(userId, chatId, userText, recentTexts) {
  // The search covers all chats of this user, old ones and the current one
  let found = await searchSimilarMessages(userId, userText, RECALL_SEMANTIC_LIMIT);

  if (wantsRecall(userText)) {
    const recent = await getUserMessagesFromOtherChats(userId, chatId, RECALL_RECENT_LIMIT);
    found = recent.concat(found);
  }

  // Remove repeated texts and stop when we reach the token limit (1 token is about 4 characters)
  const snippets = [];
  const seenTexts = recentTexts.slice();
  let tokens = 0;
  for (const item of found) {
    if (seenTexts.includes(item.text)) continue;
    tokens = tokens + Math.ceil(item.text.length / 4);
    if (tokens > RECALL_MAX_TOKENS) break;
    seenTexts.push(item.text);
    snippets.push({
      chatId: item.chatId,
      role: item.role,
      text: item.text,
      createdAt: item.createdAt,
    });
  }
  return snippets;
}
