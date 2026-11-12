import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Change the model here only
export const MODEL_ID = 'llama-3.3-70b-versatile';
export const model = groq(MODEL_ID);

// How many of the latest messages we send to the model
export const MAX_HISTORY = 12;

// Max tokens the model may write in one answer
export const MAX_OUTPUT_TOKENS = 1024;

// Max number of steps (search, then answer) for one reply
export const MAX_STEPS = 3;

// Search tool limits. The model is small, so we keep tool output short.
export const SEARCH_MAX_RESULTS = 5;
export const SEARCH_SNIPPET_LENGTH = 300;
export const SEARCH_TIMEOUT_SECONDS = 6;
export const SEARCH_CACHE_MINUTES = 10;

// Memory settings
export const RECALL_MAX_TOKENS = 600;
export const RECALL_RECENT_LIMIT = 5;
export const RECALL_SEMANTIC_LIMIT = 2;
export const RECALL_MIN_SCORE = 0.5;
export const RECALL_TIMEOUT_MS = 3000;
