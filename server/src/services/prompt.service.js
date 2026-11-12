// Builds the system prompt that tells the model how to behave
export function buildSystemPrompt() {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateText = now.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return [
    'You are a helpful, friendly chat assistant.',
    'Current date and time: ' + dateText + ' (' + timezone + ').',
    '',
    'Rules:',
    '- Keep answers short and clear.',
    '- Be honest. If you do not know something, say so.',
    '- Do not make things up.',
  ].join('\n');
}
