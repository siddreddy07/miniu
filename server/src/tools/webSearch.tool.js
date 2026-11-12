import { tool } from 'ai';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { getFromCache, saveToCache } from '../lib/cache.js';
import {
  SEARCH_MAX_RESULTS,
  SEARCH_SNIPPET_LENGTH,
  SEARCH_TIMEOUT_SECONDS,
  SEARCH_CACHE_MINUTES,
} from '../config/ai.js';

// Cuts long text so the tool result stays small
function shorten(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

async function runSearch({ query }) {
  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();

  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(cleanQuery, {
      searchDepth: 'basic',
      maxResults: SEARCH_MAX_RESULTS,
      timeout: SEARCH_TIMEOUT_SECONDS,
    });

    // Keep only what the model needs
    const results = response.results.slice(0, SEARCH_MAX_RESULTS).map((item) => ({
      title: shorten(item.title, 100),
      url: item.url,
      snippet: shorten(item.content, SEARCH_SNIPPET_LENGTH),
    }));

    const output = { query: cleanQuery, results: results };
    saveToCache(cacheKey, output, SEARCH_CACHE_MINUTES);
    return output;
  } catch (error) {
    console.log('Search error:', error.message);
    return { error: 'Search failed' };
  }
}

export const webSearch = tool({
  description: 'Search the web for recent or specific facts. Input: a short search query.',
  inputSchema: z.object({
    query: z.string().min(2).max(200),
  }),
  execute: runSearch,
});
