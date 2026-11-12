import { tool } from 'ai';
import { z } from 'zod';
import { searchWeb } from '../services/webSearch.service.js';

export const webSearch = tool({
  description: 'Search the web for recent or specific facts. Input: a short search query.',
  inputSchema: z.object({
    query: z.string().min(2).max(200),
  }),
  execute: async ({ query }) => {
    return await searchWeb(query);
  },
});
