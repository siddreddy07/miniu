import { getAnswerAfter, getUserMessagesFromOtherChats, getUserMessagesInRange, searchSimilarMessages } from './memory.service.js';
import { getDateRange } from '../lib/dateRange.js';
import { RECALL_MAX_TOKENS, RECALL_RECENT_LIMIT, RECALL_SEMANTIC_LIMIT, RECALL_DAY_LIMIT, RECALL_ANSWER_CHARS } from '../config/ai.js';

// If the user writes one of these, they are asking about the past
const RECALL_WORDS = ['earlier', 'last time', 'did i ask', 'what did i', 'remember', 'asked before', 'we talked', 'we discussed',
  'did we talk', 'have we talked', 'did we discuss', 'you suggested', 'you recommended', 'you told me', 'you said', 'you mentioned', 'you answered', 'your last answer', 'your answer before'];

// A day like "yesterday" only counts as a question about the past when one of these is also there.
// So "who won the match yesterday?" still searches the web.
const HISTORY_WORDS = ['i ask', 'i said', 'i told', 'i wrote', 'my chat', 'my question', 'our chat', 'we chat', 'we talk'];

function hasWord(text, words) {
  for (const word of words) {
    if (text.includes(word)) return true;
  }
  return false;
}

// Words that say the user also wants the CURRENT state: "any updates?", "has it changed?", "still the same?"
// For these the web search stays on, because only the web can say what is true now.
const FRESH_PATTERN = /\b(updates?|updated|changed?|changes|latest|still|anymore|currently|any news|newer)\b/;

export function wantsFresh(text) {
  return FRESH_PATTERN.test(text.toLowerCase());
}

// Exported because the chat service also needs to know if this is a question about the past
export function wantsRecall(text, timezone) {
  const lowerText = text.toLowerCase();
  if (hasWord(lowerText, RECALL_WORDS)) return true;
  return getDateRange(text, timezone) !== null && hasWord(lowerText, HISTORY_WORDS);
}

// Returns older messages: [{ chatId, role, text, createdAt }]
// recentTexts are the messages the model already sees in this chat, so we skip them.
// Returns [] if there is nothing good to add.
export async function getRecall(userId, chatId, userText, recentTexts, timezone) {
  // The search covers all chats of this user, old ones and the current one
  let found = await searchSimilarMessages(userId, userText, RECALL_SEMANTIC_LIMIT);

  if (wantsRecall(userText, timezone)) {
    // "yesterday", "Monday"... : read that day straight from the database
    const range = getDateRange(userText, timezone);
    const dayMessages = range ? await getUserMessagesInRange(userId, range.start, range.end, RECALL_DAY_LIMIT) : [];

    if (dayMessages.length > 0) {
      found = dayMessages;
    } else if (found.length === 0) {
      // Nothing matched by meaning, so show the latest messages from other chats
      found = await getUserMessagesFromOtherChats(userId, chatId, RECALL_RECENT_LIMIT);
    }
  }

  // Remove repeated texts (the model already sees the ones from this chat)
  const fresh = [];
  const seenTexts = recentTexts.slice();
  for (const item of found) {
    if (seenTexts.includes(item.text)) continue;
    seenTexts.push(item.text);
    fresh.push(item);
  }

  // For a question about the past, also load what the assistant answered back then
  const askingAboutPast = wantsRecall(userText, timezone);
  const answers = await Promise.all(
    fresh.map((item) => (askingAboutPast ? getAnswerAfter(item.chatId, item.createdAt) : null))
  );

  // Stop when we reach the token limit (1 token is about 4 characters)
  const snippets = [];
  let tokens = 0;
  for (let i = 0; i < fresh.length; i++) {
    const item = fresh[i];
    const answerText = answers[i] ? answers[i].text.slice(0, RECALL_ANSWER_CHARS) : '';
    tokens = tokens + Math.ceil((item.text.length + answerText.length) / 4);
    if (tokens > RECALL_MAX_TOKENS) break;
    snippets.push({
      chatId: item.chatId,
      role: item.role,
      text: item.text,
      createdAt: item.createdAt,
      answer: answerText,
    });
  }
  return snippets;
}
