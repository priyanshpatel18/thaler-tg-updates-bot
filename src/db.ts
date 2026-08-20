import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

mkdirSync(dirname(config.storage.dbPath), { recursive: true });

const db = new DatabaseSync(config.storage.dbPath);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    chat_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

export interface User {
  chatId: string;
  userId: string;
  username: string | null;
  firstName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  chat_id: string;
  user_id: string;
  username: string | null;
  first_name: string | null;
  created_at: string;
  updated_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    username: row.username,
    firstName: row.first_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Called on every /start. Inserts on first contact, refreshes username/first_name on repeat visits. */
export function recordUser(
  chatId: string,
  userId: string,
  username: string | null,
  firstName: string | null
): User {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (chat_id, user_id, username, first_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET
       user_id = excluded.user_id,
       username = excluded.username,
       first_name = excluded.first_name,
       updated_at = excluded.updated_at`
  ).run(chatId, userId, username, firstName, now, now);

  const row = db.prepare("SELECT * FROM users WHERE chat_id = ?").get(chatId) as unknown as UserRow;
  return rowToUser(row);
}

export function listUsers(): User[] {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as unknown as UserRow[];
  return rows.map(rowToUser);
}
