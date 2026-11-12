// Run once with: node scripts/setup-db.js
import 'dotenv/config';
import { createMessagesTable } from '../src/lib/db.js';

await createMessagesTable();
console.log('messages table is ready');
