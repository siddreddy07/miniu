import { tavily } from '@tavily/core';
import { getFromCache, saveToCache } from '../lib/cache.js';
import {
  SEARCH_MAX_RESULTS,
  SEARCH_SNIPPET_LENGTH,
  SEARCH_TIMEOUT_SECONDS,
  SEARCH_CACHE_MINUTES,
} from '../config/ai.js';

// Searches the web with Tavily and returns a small result
export async function searchWeb(query) {
  const cleanQuery = query.trim();

  // If we searched this recently, use the saved answer
  const saved = getFromCache(cleanQuery.toLowerCase());
  if (saved) return saved;

  try {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(cleanQuery, {
      searchDepth: 'basic',
      maxResults: SEARCH_MAX_RESULTS,
      timeout: SEARCH_TIMEOUT_SECONDS,
    });

    // Keep only title, url and a short snippet so the small model is not overloaded
    const results = response.results.map((item) => ({
      title: item.title.slice(0, 100),
      url: item.url,
      snippet: item.content.slice(0, SEARCH_SNIPPET_LENGTH),
    }));

    const output = { query: cleanQuery, results: results };
    saveToCache(cleanQuery.toLowerCase(), output, SEARCH_CACHE_MINUTES);
    return output;
  } catch (error) {
    console.log('Search error:', error.message);
    return { error: 'Search failed' };
  }
}
