// Pinecone vector database. Real calls are commented out until Phase 5.
//
// EMBED-TODO: install the Pinecone package and create the index here
// import { Pinecone } from '@pinecone-database/pinecone';
// const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// const index = pinecone.index(process.env.PINECONE_INDEX);

// Saves one message vector. metadata = { chatId, role, createdAt, text }
export async function saveVector(id, vector, metadata) {
  // EMBED-TODO: upsert the vector into Pinecone
  // await index.upsert([{ id: id, values: vector, metadata: metadata }]);
  return null;
}

// Finds the most similar messages from OTHER chats.
// Returns: [{ chatId, role, text, createdAt, score }]
export async function querySimilar(vector, currentChatId, topK) {
  // EMBED-TODO: query Pinecone, skip the current chat
  // const response = await index.query({
  //   vector: vector,
  //   topK: topK,
  //   includeMetadata: true,
  //   filter: { chatId: { $ne: currentChatId } },
  // });
  // return response.matches.map((match) => ({ ...match.metadata, score: match.score }));
  return [];
}
