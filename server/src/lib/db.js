// Neon Postgres. Stores every message with its time.
import { neon } from '@neondatabase/serverless';

// A saved message looks like: { id, chatId, role, text, createdAt }

function getSql() {
  return neon(process.env.DATABASE_URL);
}

// Turns a database row into our message shape
function rowToMessage(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    text: row.text,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Creates the table if it does not exist yet
export async function createMessagesTable() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages (chat_id, created_at DESC)`;
}

export async function insertMessage(message) {
  const sql = getSql();
  await sql`INSERT INTO messages (id, chat_id, role, text, created_at)
    VALUES (${message.id}, ${message.chatId}, ${message.role}, ${message.text}, ${message.createdAt})
    ON CONFLICT (id) DO NOTHING`;
}

export async function selectRecentMessages(chatId, limit) {
  const sql = getSql();
  const rows = await sql`SELECT id, chat_id, role, text, created_at FROM messages
    WHERE chat_id = ${chatId} ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(rowToMessage);
}

export async function selectUserMessagesFromOtherChats(chatId, limit) {
  const sql = getSql();
  const rows = await sql`SELECT id, chat_id, role, text, created_at FROM messages
    WHERE role = 'user' AND chat_id != ${chatId} ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(rowToMessage);
}
