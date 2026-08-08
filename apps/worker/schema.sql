CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,           -- Firebase Auth uid
  username TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_id TEXT NOT NULL REFERENCES users(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'quarterly')),
  invite_code TEXT UNIQUE NOT NULL,
  last_processed_round_end TEXT,  -- ISO timestamp; cron cursor, see scheduled.js
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id TEXT NOT NULL REFERENCES leagues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);

CREATE TABLE IF NOT EXISTS daily_attempts (
  league_id TEXT NOT NULL REFERENCES leagues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,             -- YYYY-MM-DD
  guesses_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (league_id, user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_leaderboard ON daily_attempts(league_id, date, score DESC);

CREATE TABLE IF NOT EXISTS round_scores (
  league_id TEXT NOT NULL REFERENCES leagues(id),
  round_key TEXT NOT NULL,        -- e.g. "2026-08-08", "2026-W33", "2026-Q3"
  user_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (league_id, round_key, user_id)
);
CREATE INDEX IF NOT EXISTS idx_round_scores_leaderboard ON round_scores(league_id, round_key, score DESC);

CREATE TABLE IF NOT EXISTS round_wins (
  league_id TEXT NOT NULL REFERENCES leagues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  wins INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (league_id, user_id)
);
