const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

// Keep the database outside source control; set DATABASE_PATH when deploying.
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, 'data', 'chat.db');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages (room, id);
`);

const insertMessage = db.prepare(`
  INSERT INTO messages (room, username, text, created_at)
  VALUES (?, ?, ?, ?)
`);

const selectRecentMessages = db.prepare(`
  SELECT id, room, username, text, created_at AS createdAt
  FROM messages
  WHERE room = ?
  ORDER BY id DESC
  LIMIT 50
`);

function saveMessage({ room, username, text, createdAt }) {
  const result = insertMessage.run(room, username, text, createdAt);

  return {
    id: result.lastInsertRowid,
    room,
    username,
    text,
    createdAt
  };
}

function getRecentMessages(room) {
  // The query returns newest first for LIMIT, so reverse for display order.
  return selectRecentMessages.all(room).reverse();
}

module.exports = {
  saveMessage,
  getRecentMessages
};
