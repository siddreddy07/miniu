import { randomUUID } from 'node:crypto';
import {
  insertChat,
  insertMessage,
  selectChats,
  selectChatMessages,
  selectUserMessagesFromOtherChats,
} from '../lib/db.js';
import { embedText } from '../lib/embeddings.js';
import { saveVector, querySimilar } from '../lib/vectorStore.js';
import { RECALL_MIN_SCORE } from '../config/ai.js';

// Every function here uses try/catch.
// If the database, Cohere or Pinecone fails, we log it and the chat keeps working.
// Every function also takes the userId, so one user never sees another user's data.

// Makes the chat row the first time we see this chat. The title is the first message.
export async function createChat(userId, chatId, firstText) {
  try {
    await insertChat(chatId, userId, firstText.slice(0, 40));
  } catch (error) {
    console.log('Could not create chat:', error.message);
  }
}

export async function getChats(userId) {
  try {
    return await selectChats(userId);
  } catch (error) {
    console.log('Could not read chats:', error.message);
    return [];
  }
}

export async function getChatMessages(userId, chatId) {
  try {
    return await selectChatMessages(chatId, userId);
  } catch (error) {
    console.log('Could not read chat messages:', error.message);
    return [];
  }
}

export async function saveMessage(userId, chatId, role, text, id) {
  const message = {
    id: id || randomUUID(),
    userId: userId,
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

export async function getUserMessagesFromOtherChats(userId, chatId, limit) {
  try {
    return await selectUserMessagesFromOtherChats(userId, chatId, limit);
  } catch (error) {
    console.log('Could not read other chats:', error.message);
    return [];
  }
}

// Turns the message into a vector and saves it in Pinecone
export async function indexMessage(message) {
  try {
    const vector = await embedText(message.text, 'search_document');
    // Vector id looks like: <userId>-<chatId>-<timestamp>
    const vectorId = message.userId + '-' + message.chatId + '-' + Date.parse(message.createdAt);
    await saveVector(vectorId, vector, {
      userId: message.userId,
      chatId: message.chatId,
      messageId: message.id,
      role: message.role,
      createdAt: message.createdAt,
      text: message.text,
    });
  } catch (error) {
    console.log('Could not index message:', error.message);
  }
}

// Finds older messages of this user (from other chats) that mean something similar
export async function searchSimilarMessages(userId, chatId, text, limit) {
  try {
    const vector = await embedText(text, 'search_query');
    const matches = await querySimilar(vector, userId, chatId, limit);
    return matches.filter((match) => match.score >= RECALL_MIN_SCORE);
  } catch (error) {
    console.log('Could not search similar messages:', error.message);
    return [];
  }
}
