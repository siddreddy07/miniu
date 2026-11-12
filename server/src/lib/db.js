// Neon Postgres. Three tables, linked like this:
//   users     (id, created_at)
//   chats     (id, user_id -> users, title, created_at)        one user has many chats (conversations)
//   messages  (id, chat_id -> chats, role, text, created_at)   one chat has many messages
// A message belongs only to its chat. To find a user's messages we go through the chat.
import { neon } from '@neondatabase/serverless';

function getSql() {
  return neon(process.env.DATABASE_URL);
}

// Turns a database row into our message shape: { id, chatId, role, text, createdAt }
function rowToMessage(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    text: row.text,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Creates the tables if they do not exist yet
export async function createTables() {
  const sql = getSql();

  // 1. users: one row per person (the id comes from the browser's localStorage)
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  // 2. chats (conversations): each one belongs to one user
  await sql`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  // 3. messages: each one belongs to one chat
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id),
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await sql`CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages (chat_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS chats_user_idx ON chats (user_id, created_at DESC)`;
}

// Makes the user row the first time we see this user
export async function insertUser(userId) {
  const sql = getSql();
  await sql`INSERT INTO users (id) VALUES (${userId}) ON CONFLICT (id) DO NOTHING`;
}

// Finds one chat, but only if it belongs to this user. Returns null if not found.
export async function selectChat(chatId, userId) {
  const sql = getSql();
  const rows = await sql`SELECT id, title, created_at FROM chats
    WHERE id = ${chatId} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    title: rows[0].title,
    createdAt: new Date(rows[0].created_at).toISOString(),
  };
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

// All messages of one chat, oldest first. Check the chat belongs to the user BEFORE calling this.
export async function selectChatMessages(chatId) {
  const sql = getSql();
  const rows = await sql`SELECT id, chat_id, role, text, created_at FROM messages
    WHERE chat_id = ${chatId} ORDER BY created_at ASC`;
  return rows.map(rowToMessage);
}

export async function insertMessage(message) {
  const sql = getSql();
  await sql`INSERT INTO messages (id, chat_id, role, text, created_at)
    VALUES (${message.id}, ${message.chatId}, ${message.role}, ${message.text}, ${message.createdAt})
    ON CONFLICT (id) DO NOTHING`;
}

// The latest user messages of this user, from all chats except the current one
export async function selectUserMessagesFromOtherChats(userId, chatId, limit) {
  const sql = getSql();
  const rows = await sql`SELECT m.id, m.chat_id, m.role, m.text, m.created_at
    FROM messages m
    JOIN chats c ON c.id = m.chat_id
    WHERE c.user_id = ${userId} AND m.role = 'user' AND m.chat_id != ${chatId}
    ORDER BY m.created_at DESC LIMIT ${limit}`;
  return rows.map(rowToMessage);
}
