// Neon Postgres. Every real call is commented out until Phase 5.
//
// DB-TODO: install the Neon package and create the client here
// import { neon } from '@neondatabase/serverless';
// const sql = neon(process.env.DATABASE_URL);

// A saved message looks like: { id, chatId, role, text, createdAt }

export async function insertMessage(message) {
  // DB-TODO: INSERT the message into the "messages" table
  // await sql`INSERT INTO messages (id, chat_id, role, text, created_at)
  //   VALUES (${message.id}, ${message.chatId}, ${message.role}, ${message.text}, ${message.createdAt})`;
  return null;
}

export async function selectRecentMessages(chatId, limit) {
  // DB-TODO: SELECT the latest messages of this chat, newest first
  // const rows = await sql`SELECT id, chat_id, role, text, created_at FROM messages
  //   WHERE chat_id = ${chatId} ORDER BY created_at DESC LIMIT ${limit}`;
  // return rows.map(rowToMessage);
  return [];
}

export async function selectUserMessagesFromOtherChats(chatId, limit) {
  // DB-TODO: SELECT the latest user messages from every chat except this one
  // const rows = await sql`SELECT id, chat_id, role, text, created_at FROM messages
  //   WHERE role = 'user' AND chat_id != ${chatId} ORDER BY created_at DESC LIMIT ${limit}`;
  // return rows.map(rowToMessage);
  return [];
}

// DB-TODO: turn a database row into our message shape
// function rowToMessage(row) {
//   return { id: row.id, chatId: row.chat_id, role: row.role, text: row.text, createdAt: row.created_at };
// }
