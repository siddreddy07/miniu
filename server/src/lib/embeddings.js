// Cohere embeddings: turns text into a list of 1024 numbers.
import { CohereClient } from 'cohere-ai';

// type is "search_document" when saving a message, "search_query" when searching
export async function embedText(text, type) {
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  const response = await cohere.embed({
    texts: [text.slice(0, 2000)],
    model: 'embed-english-v3.0',
    inputType: type,
    embeddingTypes: ['float'],
  });
  return response.embeddings.float[0];
}
