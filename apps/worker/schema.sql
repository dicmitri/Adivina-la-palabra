CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,          -- Firebase Auth uid
  username TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
