# Devlog

A record of each round of work on this project: what changed and, where
relevant, what went wrong and how it got fixed. Not a transcript of every
conversation — just what was done.

## 2026-08-08 — Initial scaffold

Set up the repo as a monorepo (`apps/web`, `apps/worker`) targeting
Cloudflare Pages + Workers + D1, with Firebase Authentication used for
login only.

Built and verified end-to-end: a user can sign up/sign in via Firebase
Auth in the React frontend, which calls a protected Worker route
(`/api/me`) with the Firebase ID token; the Worker verifies that token
itself (checks the signature against Google's public keys directly,
without the Firebase Admin SDK) and reads/writes a `users` row in D1.

No game logic yet (no leagues, no secret word, no scoring) — this round
was purely about proving the three services (Pages, Workers, D1) plus
Firebase Auth actually integrate before building the game on top.

Added `ARCHITECTURE.md`, `AGENTS.md`, and this file to keep direction and
decisions durable across sessions.

## 2026-08-08 — Game engine: leagues, daily word, scoring

Built the actual game on top of the scaffold, ported from the family app's
proven engine but rebuilt so the Worker is the sole authority on the word
and the score.

- D1 schema: `users`, `leagues`, `league_members`, `daily_attempts`,
  `round_scores`, `round_wins`. `daily_attempts` stores guesses as a JSON
  array rather than fixed columns, so attempt count/word length can change
  later without a schema migration.
- The dictionary lives only in `apps/worker/src/lib/dictionary.json` —
  never bundled into the website. `POST /api/leagues/:id/guess` returns
  per-letter feedback and only reveals the word once the round is won or
  lost.
- Round-winner crediting (trophies) moved off the client entirely: a
  Worker Cron Trigger (`apps/worker/src/scheduled.js`) processes any round
  that has closed since it last ran, using the same catch-up-multiple-
  missed-rounds approach the family app used client-side, just server-side
  and guaranteed to actually run.
- **Problem caught during testing**: the first version of `GET
  /api/leagues/:id/today` only returned raw guesses, no per-letter
  feedback. That works fine mid-session (the guess response carries its
  own feedback), but a page reload mid-round would have redrawn the board
  with blank tiles, since the browser never has the word to recompute
  feedback itself. Fixed by having the Worker compute and return feedback
  for every stored guess, not just the latest one — it already knows the
  word, so this reveals nothing new.
- Verified with `wrangler deploy --dry-run` (both apps bundle cleanly),
  applying `schema.sql` to a local D1 instance, `vite build`, and a
  `wrangler dev` smoke test confirming protected routes 401 without a
  token. Not yet tested against a real Firebase project (no project
  created yet) or in a browser.
