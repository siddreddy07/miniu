// Pinecone vector database: finds messages that mean something similar.
import { Pinecone } from '@pinecone-database/pinecone';

function getIndex() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pinecone.index(process.env.PINECONE_INDEX_NAME);
}

// Saves one message vector. metadata = { userId, chatId, messageId, role, createdAt, text }
export async function saveVector(id, vector, metadata) {
  const index = getIndex();
  await index.upsert({ records: [{ id: id, values: vector, metadata: metadata }] });
}

// Finds the most similar messages of THIS user, from OTHER chats.
// Returns: [{ userId, chatId, role, text, createdAt, score }]
export async function querySimilar(vector, userId, currentChatId, topK) {
  const index = getIndex();
  const response = await index.query({
    vector: vector,
    topK: topK,
    includeMetadata: true,
    filter: {
      userId: { $eq: userId },
      chatId: { $ne: currentChatId },
    },
  });
  return response.matches.map((match) => ({ ...match.metadata, score: match.score }));
}
