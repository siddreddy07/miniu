// Run with: npm run eval   (the server must be running first)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const url = 'http://localhost:' + (process.env.PORT || 4000) + '/api/chat';
const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'));

// Sends one question and measures the time
async function askQuestion(question) {
  const body = {
    id: randomUUID(),
    messages: [{ id: randomUUID(), role: 'user', parts: [{ type: 'text', text: question }] }],
  };

  const startTime = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  let firstToken = null;
  let searched = false;
  let failed = false;
  let buffer = '';
  const decoder = new TextDecoder();

  for await (const piece of response.body) {
    buffer = buffer + decoder.decode(piece, { stream: true });
    if (buffer.includes('"type":"text-delta"') && firstToken === null) firstToken = Date.now() - startTime;
    if (buffer.includes('"toolName":"webSearch"')) searched = true;
    if (buffer.includes('"type":"error"')) failed = true;
  }

  return { firstToken: firstToken, total: Date.now() - startTime, searched: searched, failed: failed };
}

console.log('type       | search | first token | total  | question');
for (const item of questions) {
  const r = await askQuestion(item.question);
  const first = r.firstToken === null ? '-' : r.firstToken + 'ms';
  const status = r.failed ? ' (ERROR)' : r.searched === item.expectSearch ? '' : ' (unexpected)';
  console.log(
    item.type.padEnd(10) + ' | ' +
    (r.searched ? 'yes' : 'no').padEnd(6) + ' | ' +
    first.padEnd(11) + ' | ' +
    (r.total + 'ms').padEnd(6) + ' | ' +
    item.question + status
  );
}
