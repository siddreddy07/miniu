// Makes a date like "Nov 12, 2026, 2:03 PM"
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Makes the text block that lists what the user said in earlier chats
export function buildMemoryBlock(snippets) {
  if (!snippets || snippets.length === 0) return '';

  const lines = ['Earlier chats (the user said these before, use them only if they help):'];
  for (const snippet of snippets) {
    lines.push('- [' + formatDate(snippet.createdAt) + '] ' + snippet.role + ': ' + snippet.text);
  }
  return lines.join('\n');
}

// Builds the system prompt that tells the model how to behave
export function buildSystemPrompt(snippets) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateText = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const lines = [
    'You are a helpful, friendly chat assistant.',
    'Current date and time: ' + dateText + ' (' + timezone + ').',
    '',
    'Web search rules:',
    '- Use the webSearch tool only for recent, specific or uncertain facts.',
    '- Do not search for greetings, small talk or things you know well.',
    '- Search at most twice. Use a short query (a few words). You cannot open links, only read the search results.',
    '- When you use search results, cite them like [1], [2]. The number is the position of the result in the list.',
    '- If the results do not answer the question, say so.',
    '- If the search tool returns an error, tell the user the search failed. Then answer only what you are sure about.',
    '- Cite only with plain numbers like [1] or [2]. Never use other bracket styles.',
    '- Do NOT write a list of sources, links or website names. The app already shows the sources as buttons.',
    '- Never make up links or facts.',
    '',
    'Style:',
    '- Keep answers short and clear: a short paragraph or a few bullet points.',
    '- Be honest. If you do not know something, say so.',
  ];

  const memoryBlock = buildMemoryBlock(snippets);
  if (memoryBlock !== '') {
    lines.push('');
    lines.push(memoryBlock);
  }

  return lines.join('\n');
}
