import { randomUUID } from 'node:crypto';
import { insertMessage, selectUserMessagesFromOtherChats } from '../lib/db.js';
import { embedText } from '../lib/embeddings.js';
import { saveVector, querySimilar } from '../lib/vectorStore.js';
import { RECALL_MIN_SCORE } from '../config/ai.js';

// Every function here uses try/catch.
// If the database, Cohere or Pinecone fails, we log it and the chat keeps working.

export async function saveMessage(chatId, role, text, id) {
  const message = {
    id: id || randomUUID(),
    chatId: chatId,
    role: role,
    text: text,
    createdAt: new Date().toISOString(),
  };

  try {
    await insertMessage(message);
  } catch (error) {
    console.log('Could not save message:', error.message);
  }
  return message;
}

export async function getUserMessagesFromOtherChats(chatId, limit) {
  try {
    return await selectUserMessagesFromOtherChats(chatId, limit);
  } catch (error) {
    console.log('Could not read other chats:', error.message);
    return [];
  }
}

// Turns the message into a vector and saves it in Pinecone
export async function indexMessage(message) {
  try {
    const vector = await embedText(message.text, 'search_document');
    await saveVector(message.id, vector, {
      chatId: message.chatId,
      role: message.role,
      createdAt: message.createdAt,
      text: message.text,
    });
  } catch (error) {
    console.log('Could not index message:', error.message);
  }
}

// Finds older messages (from other chats) that mean something similar
export async function searchSimilarMessages(text, chatId, limit) {
  try {
    const vector = await embedText(text, 'search_query');
    const matches = await querySimilar(vector, chatId, limit);
    return matches.filter((match) => match.score >= RECALL_MIN_SCORE);
  } catch (error) {
    console.log('Could not search similar messages:', error.message);
    return [];
  }
}
