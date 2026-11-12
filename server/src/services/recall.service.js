import { getUserMessagesFromOtherChats, searchSimilarMessages } from './memory.service.js';
import { RECALL_MAX_TOKENS, RECALL_RECENT_LIMIT, RECALL_SEMANTIC_LIMIT } from '../config/ai.js';

const RECALL_WORDS = [
  'earlier',
  'before',
  'last time',
  'yesterday',
  'did i ask',
  'what did i',
  'previous',
  'remember',
];

// Does the user seem to be asking about the past?
export function wantsRecall(text) {
  const lowerText = text.toLowerCase();
  for (const word of RECALL_WORDS) {
    if (lowerText.includes(word)) return true;
  }
  return false;
}

// Removes snippets with the same text
export function removeDuplicates(snippets) {
  const seen = [];
  const result = [];
  for (const snippet of snippets) {
    const key = snippet.text.trim().toLowerCase();
    if (seen.includes(key)) continue;
    seen.push(key);
    result.push(snippet);
  }
  return result;
}

// Keeps snippets until we reach the token limit (1 token is about 4 characters)
export function limitTokens(snippets, maxTokens) {
  const result = [];
  let tokens = 0;
  for (const snippet of snippets) {
    const snippetTokens = Math.ceil(snippet.text.length / 4);
    if (tokens + snippetTokens > maxTokens) break;
    tokens = tokens + snippetTokens;
    result.push(snippet);
  }
  return result;
}

// Returns snippets from older chats: [{ chatId, role, text, createdAt }]
// Returns [] when there is nothing good to add.
export async function getRecall(chatId, userText) {
  try {
    const semantic = await searchSimilarMessages(userText, chatId, RECALL_SEMANTIC_LIMIT);

    let all = semantic;
    if (wantsRecall(userText)) {
      const recent = await getUserMessagesFromOtherChats(chatId, RECALL_RECENT_LIMIT);
      all = recent.concat(semantic);
    }

    const unique = removeDuplicates(all);
    const snippets = unique.map((item) => ({
      chatId: item.chatId,
      role: item.role,
      text: item.text,
      createdAt: item.createdAt,
    }));
    return limitTokens(snippets, RECALL_MAX_TOKENS);
  } catch (error) {
    console.log('Recall failed:', error.message);
    return [];
  }
}
