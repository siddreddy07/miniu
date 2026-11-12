// Neon Postgres. Two tables:
//   chats    - one row per chat (id, user_id, title, created_at)
//   messages - many rows per chat (id, chat_id, user_id, role, text, created_at)
// Every query is limited to one user_id, so users never see each other's data.
import { neon } from '@neondatabase/serverless';

function getSql() {
  return neon(process.env.DATABASE_URL);
}

// Turns a database row into our message shape: { id, chatId, userId, role, text, createdAt }
function rowToMessage(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Creates the tables if they do not exist yet
export async function createTables() {
  const sql = getSql();

  await sql`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_id TEXT,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  // For tables made before we had users
  await sql`ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id TEXT`;

  await sql`CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages (chat_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS messages_user_idx ON messages (user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS chats_user_idx ON chats (user_id, created_at DESC)`;
}

export async function insertChat(chatId, userId, title) {
  const sql = getSql();
  await sql`INSERT INTO chats (id, user_id, title) VALUES (${chatId}, ${userId}, ${title}) ON CONFLICT (id) DO NOTHING`;
}

// All chats of one user, newest first
export async function selectChats(userId) {
  const sql = getSql();
  const rows = await sql`SELECT id, title, created_at FROM chats
    WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100`;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

// All messages of one chat (only if it belongs to this user), oldest first
export async function selectChatMessages(chatId, userId) {
  const sql = getSql();
  const rows = await sql`SELECT id, chat_id, user_id, role, text, created_at FROM messages
    WHERE chat_id = ${chatId} AND user_id = ${userId} ORDER BY created_at ASC`;
  return rows.map(rowToMessage);
}

export async function insertMessage(message) {
  const sql = getSql();
  await sql`INSERT INTO messages (id, chat_id, user_id, role, text, created_at)
    VALUES (${message.id}, ${message.chatId}, ${message.userId}, ${message.role}, ${message.text}, ${message.createdAt})
    ON CONFLICT (id) DO NOTHING`;
}

// The latest user messages of this user, from all chats except the current one
export async function selectUserMessagesFromOtherChats(userId, chatId, limit) {
  const sql = getSql();
  const rows = await sql`SELECT id, chat_id, user_id, role, text, created_at FROM messages
    WHERE role = 'user' AND user_id = ${userId} AND chat_id != ${chatId}
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(rowToMessage);
}
