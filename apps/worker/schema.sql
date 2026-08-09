CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,           -- Firebase Auth uid
  username TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_id TEXT NOT NULL REFERENCES users(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'quarterly')),
  invite_code TEXT UNIQUE NOT NULL,
  last_processed_round_end TEXT,  -- ISO timestamp; cron cursor, see scheduled.js
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id TEXT NOT NULL REFERENCES leagues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
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

-- Words players think should be accepted. One row per (word, player), so a
-- player cannot inflate a word's count, but the number of distinct players
-- asking for a word is a useful signal when reviewing it.
CREATE TABLE IF NOT EXISTS word_suggestions (
  word TEXT NOT NULL,             -- normalised: uppercase, accents stripped, ñ kept
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  PRIMARY KEY (word, user_id)
);
CREATE INDEX IF NOT EXISTS idx_word_suggestions_status ON word_suggestions(status, word);

-- Approved additions to the guess list. Checked at guess time alongside the
-- bundled list, so accepting a word takes effect immediately rather than
-- waiting for a redeploy.
CREATE TABLE IF NOT EXISTS extra_words (
  word TEXT PRIMARY KEY,
  approved_by TEXT NOT NULL REFERENCES users(id),
  approved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
