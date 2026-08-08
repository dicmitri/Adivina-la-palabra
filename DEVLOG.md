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
