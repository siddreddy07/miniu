// Run with: node scripts/test-recall.js
// Shows the memory block with fake snippets, so no database is needed.
import { buildMemoryBlock, buildSystemPrompt } from '../src/services/prompt.service.js';
import { wantsRecall, removeDuplicates, limitTokens } from '../src/services/recall.service.js';

const fakeSnippets = [
  { chatId: 'chat-a', role: 'user', text: 'What is the capital of Australia?', createdAt: '2026-11-11T09:30:00.000Z' },
  { chatId: 'chat-a', role: 'user', text: 'what is the capital of australia?', createdAt: '2026-11-11T09:31:00.000Z' },
  { chatId: 'chat-b', role: 'user', text: 'Best way to learn guitar chords', createdAt: '2026-11-12T08:33:00.000Z' },
  { chatId: 'chat-c', role: 'user', text: 'x'.repeat(3000), createdAt: '2026-11-12T09:00:00.000Z' },
];

const unique = removeDuplicates(fakeSnippets);
const capped = limitTokens(unique, 600);

console.log('wantsRecall("what did I ask earlier?") =', wantsRecall('what did I ask earlier?'));
console.log('wantsRecall("hi") =', wantsRecall('hi'));
console.log('snippets: ' + fakeSnippets.length + ' -> ' + unique.length + ' after dedupe -> ' + capped.length + ' after token cap');
console.log('\n--- memory block ---');
console.log(buildMemoryBlock(capped));
console.log('\n--- empty memory block (should be blank) ---');
console.log(JSON.stringify(buildMemoryBlock([])));
console.log('\n--- full system prompt ---');
console.log(buildSystemPrompt(capped));
