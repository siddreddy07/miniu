// Pinecone vector database: finds messages that mean something similar.
// Every user has their own namespace (the namespace is the userId),
// so one user's vectors are completely separate from another user's.
import { Pinecone } from '@pinecone-database/pinecone';

function getUserIndex(userId) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pinecone.index(process.env.PINECONE_INDEX_NAME).namespace(userId);
}

// Saves one message vector in the user's namespace.
// metadata = { chatId, chatCreatedAt, role, createdAt, text }
export async function saveVector(userId, id, vector, metadata) {
  const index = getUserIndex(userId);
  await index.upsert({ records: [{ id: id, values: vector, metadata: metadata }] });
}

// Finds the most similar messages in the user's namespace, from any of their chats.
// No filter is needed here. More filters (like dates) can be added later.
// Returns: [{ chatId, chatCreatedAt, role, text, createdAt, score }]
export async function querySimilar(vector, userId, topK) {
  const index = getUserIndex(userId);
  const response = await index.query({
    vector: vector,
    topK: topK,
    includeMetadata: true,
  });
  return response.matches.map((match) => ({ ...match.metadata, score: match.score }));
}
