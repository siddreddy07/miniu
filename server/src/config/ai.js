import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Change the model here only
export const MODEL_ID = 'llama-3.3-70b-versatile';
export const model = groq(MODEL_ID);

// How many of the latest messages we send to the model
export const MAX_HISTORY = 12;

// Max tokens the model may write in one answer
export const MAX_OUTPUT_TOKENS = 1024;
