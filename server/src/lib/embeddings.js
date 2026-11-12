// Cohere embeddings. The real call is commented out until Phase 5.
//
// EMBED-TODO: install the Cohere package and create the client here
// import { CohereClient } from 'cohere-ai';
// const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// type is "search_document" when saving a message, "search_query" when searching
export async function embedText(text, type) {
  // EMBED-TODO: ask Cohere to turn the text into a list of numbers
  // const response = await cohere.embed({
  //   texts: [text],
  //   model: 'embed-english-v3.0',
  //   inputType: type,
  //   embeddingTypes: ['float'],
  // });
  // return response.embeddings.float[0];
  return null;
}
