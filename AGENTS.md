# Agent guardrails

Instructions for any AI agent (Claude Code or otherwise) working in this
repository. Read `ARCHITECTURE.md` and the most recent entries of
`DEVLOG.md` before starting work — they're the context a fresh session
doesn't otherwise have.

## Non-negotiables

- **The secret word never reaches the browser.** Guess-checking, scoring,
  and round-winner logic run in `apps/worker` only. If you find yourself
  writing game logic in `apps/web`, stop — that's the exact mistake this
  rebuild exists to fix.
- **Firebase is for Auth only.** Do not add Firestore, Storage, Cloud
  Functions, or any other Firebase product to this project, even for
  something that seems small or temporary. All app data lives in D1.
- **No feature that requires a paid tier or a card on file**, on either
  Cloudflare or Firebase, without explicitly flagging it to the user first
  and getting confirmation. This project's cost-can-never-surprise-us
  property is a deliberate design goal, not an accident.
- **Schema changes go through `apps/worker/schema.sql`** (or a numbered
  migration file if/when this grows past one file), never as an ad hoc
  `ALTER TABLE` typed directly against the remote database. The schema file
  is the source of truth for what the database looks like.
- **The privacy notice must stay true.** `apps/web/src/components/Privacy.jsx`
  states what is collected and what is not — no analytics, no tracking
  cookies, no ads, and the player's email never stored in D1. Adding any of
  those, or a new field holding personal data, means updating that page in
  the same change.
- **Admin/permission checks are enforced in the Worker**, not just hidden
  in the UI. If a league action (rename, delete, kick a member) should be
  admin-only, the Worker route must check that itself.

## Keeping work consistent across sessions

Every session starts cold. To avoid contradicting or re-deciding things a
previous session already settled:

- Before making an architectural choice (new dependency, new data model,
  new third-party service), check `ARCHITECTURE.md` first. If what you're
  about to do would contradict it, that's a signal to either follow the
  doc or explicitly raise the conflict with the user — not to quietly
  diverge.
- When a decision is made that changes direction (a new stack piece, a
  scrapped approach, a changed feature scope), update `ARCHITECTURE.md` in
  the same change, not as a follow-up someone might forget.
- After finishing a unit of work, add a `DEVLOG.md` entry (see that file's
  format). This is what lets the next session — yours or another agent's —
  understand what already happened without re-reading every past
  conversation.
- Don't assume undocumented context from a previous conversation still
  holds. If something looks off or unfinished, ask rather than guess.

## Delegating to save tokens

Before starting a multi-step task, assess whether parts of it are
mechanical enough to hand to a smaller/cheaper subagent instead of doing
everything at the primary model's cost. Good candidates for delegation:
boilerplate generation, repetitive file edits following an established
pattern, running and summarizing test/build output, straightforward
research or lookups with a clear right answer.

Keep for the primary agent (do not delegate): architecture and data-model
decisions, anything touching auth/token verification, anti-cheat or
permission logic, and any change that isn't a mechanical application of an
already-settled plan. When in doubt about whether something is safe to
delegate, don't — a wrong call here is more expensive than the tokens saved.

If you do delegate, briefly note in your response what was delegated and
why, so the reasoning is visible rather than silent.
