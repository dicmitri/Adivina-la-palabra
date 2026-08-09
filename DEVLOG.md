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

## 2026-08-09 — Provisioned and deployed

Everything is now live:

- **API**: https://adivina-la-palabra-api.ristlincin.workers.dev
- **Site**: https://adivina-la-palabra.pages.dev
- **Firebase project** (Auth only): `adivina-la-palabra-ligas`
- **D1**: `adivina-la-palabra` (`0bc43d5a-856a-4a6b-b523-85d4d0cba9e0`)

Deployment moved to GitHub Actions. The session container that this work
happens in has an egress policy that blocks `api.cloudflare.com` (and
`*.workers.dev`), so nothing Cloudflare-related can be provisioned,
deployed, or tested from the dev environment — CI runners do all of it.
`cloudflare-setup.yml` provisions idempotently; `deploy.yml` applies the
schema, deploys Worker + Pages, and smoke-tests the live URL.

Problems hit along the way, in order:

1. **Firebase project limit.** The primary Google account was at its
   project quota. Deleting a project does not free a slot immediately —
   deleted projects sit in a 30-day pending-deletion state and still
   count. Worked around by creating the project under a secondary Google
   account; the primary was then added as an Owner so it can be managed
   from either. Note the project ID `adivina-la-palabra-ligas` is
   *similar but not identical* to the family app's
   `adivina-la-palabra---ligas` (three dashes) — different projects,
   verified by comparing apiKey/appId.
2. **API token scopes, discovered one at a time.** The token needed
   D1:Edit, Pages:Edit, *and* Workers Scripts:Edit. Only the first two
   were granted initially, so the Worker deploy failed with
   `Authentication error [code: 10000]` against
   `/accounts/*/workers/services/*` while D1 and Pages steps passed.
3. **`CLOUDFLARE_ACCOUNT_ID` is not optional.** Without it wrangler tries
   to auto-discover the account via `/memberships`, which a narrowly
   scoped token cannot read — producing the same opaque `[code: 10000]`
   error as a genuine permissions problem. Setting the ID explicitly
   avoids the lookup entirely.
4. **No workers.dev subdomain registered.** The Worker uploaded fine but
   had nowhere to be served from; wrangler prompts for a subdomain
   interactively and defaults to "no" in CI. Registering one on the
   account (`ristlincin`) fixed it. This is a one-time, account-wide
   choice that cannot be automated.

Added a CI smoke test after deploy so a green pipeline means the API
actually answers, not merely that the upload succeeded — the earlier
failures all looked like "deploy worked" right up until something
downstream didn't.

Still untested: the browser flow (signup → create league → guess →
leaderboard) against the live stack.

## 2026-08-09 — Word lists rebuilt; ñ and word-selection fixes

Confirmed the full browser flow works against the live stack, then took on
the problem that killed the family game: the word list contained obscure
words *and* was missing ordinary ones.

The fix was structural rather than a better-cleaned list. Both complaints
came from one list serving two conflicting jobs — it had to be permissive
enough to accept any guess, which forced it to hold obscure words, which
then became answers. Splitting it makes each job easy:

- `allowed.json` (8,952 words) — accepted as guesses. Permissive on
  purpose; obscurity here just means fewer real words wrongly rejected.
- `answers.json` (1,213 words, ~3.3 years at one/day) — the only source of
  secret words.

`scripts/build_wordlists.py` regenerates both. Answers must clear a
frequency threshold (wordfreq zipf ≥ 2.8), be their own lemma (drops
conjugated verbs and plurals — simplemma caught 12/12 in testing), appear
in the legacy Spanish word list (drops most proper nouns, which the
lowercased corpus is full of), not be tagged PROPN by spaCy, contain no
k/w, end in a letter Spanish words actually end in (drops loanwords like
`saint`, `debut`), and be unique after accent-stripping (`epoca` and
`época` are the same puzzle). What survived still needed a read-through:
names, places, brands, scraped misspellings (`nacio`, `volvi`), clitic
forms (`darlo`, `denme`) and untranslated English are in explicit
blocklists in the script.

For scale, the old engine picked `SERBA` (zipf 1.21) and `LANDE` (1.67) as
two leagues' answers during testing, where `perro` scores 4.90. 505 of the
old list's 4,541 entries were conjugated verb forms scoring 0.00.

Two bugs found and fixed in the same pass:

- **The Ñ key did nothing.** `normalizeWord` decomposed ñ to n + combining
  tilde and stripped all combining marks, so `PEÑA` and `PENA` were the
  same word and the Ñ key was indistinguishable from N. Now every accent
  is stripped *except* a tilde sitting on an n. Accents (á/é/í) are still
  stripped, as before.
- **Word selection skipped and repeated.** `hash(day) % length` visits some
  words never and others twice. Each league now walks its own seeded
  shuffle of the answer list, so it uses all 1,213 before any repeat —
  verified over a full cycle. The order is derived from the league id, so
  nothing about the schedule is stored.

`dictionary.json` stays in the repo as an input to the build script, but is
no longer imported by the Worker.

## 2026-08-09 — Sharing, password change, physical keyboard, gold winner

Four features, three of them restoring things the family app had that the
rebuild had not yet reached.

- **Share result.** Rebuilds the emoji grid (🟩🟨⬛) from the feedback the
  server already returns, so the client still never needs the word. Uses
  the native share sheet where available — which covers WhatsApp, the
  family app's hardcoded target, plus everything else — and falls back to
  copying to the clipboard on desktop, where `navigator.share` is rare.
- **Change password.** Firebase `updatePassword`, with the
  `auth/requires-recent-login` and `auth/weak-password` cases turned into
  plain Spanish instead of raw error codes.
- **Physical keyboard.** The board was click-only on desktop. Now bound to
  `keydown`, ignoring events while focus is in a text field so typing a
  league name or a password does not also type into the board. Accented
  vowels fold onto their base letter (á → A) while ñ stays itself, mirroring
  the server's own normalisation. (A cedilla folds too, so ç → C; harmless,
  since C is a valid letter.)
- **Yesterday's winner in gold.** Needed server data, so the leaderboard
  endpoint now also returns `yesterdayWinner`. Requires a score above zero,
  so nobody gets crowned on a day when nobody solved the word.

The trophy cron still has never executed — it fires at 00:05 UTC, and no
round had closed at the time of writing. Verifying it (including that it is
idempotent and catches up multiple missed rounds) is the next open task.

## 2026-08-09 — Word suggestions and an admin panel

Players can now propose a rejected word for the dictionary, and there is an
admin panel to review them and do basic league maintenance.

Two design choices worth recording:

- **One click, not a form.** At the moment of rejection the server already
  knows the word, the player and that the word is genuinely missing, so a
  form would only ask for what we have. The error now carries a
  `canSuggest` flag and the UI offers "¿Debería estarlo? Proponer «X»".
- **Approved words live in D1, not in the bundle.** `extra_words` is checked
  at guess time only when the bundled list misses, so accepting a word takes
  effect immediately instead of waiting for a redeploy, and the common path
  is still one in-memory Set lookup. Periodically these should be folded
  back into the generated list.

Spam protection is layered rather than a captcha: an account is required;
the word must be well formed, the right length, and actually missing (so
junk and already-valid words never reach the table); one row per
(word, player) means nobody can inflate a count; and there is a cap of 10
suggestions per player per day.

Admins are identified by Firebase uid via the `ADMIN_UIDS` var —
deliberately not by email, because email/password signup does not verify
the address, so anyone could register with an admin's email and inherit
their powers. Empty is the default, meaning nobody is an admin. `/api/me`
returns `isAdmin` so the client can show the entry point, but every
`/api/admin/*` route re-checks server-side. Since a uid is otherwise
invisible, the app now shows your own under the "Contraseña" menu.

The panel covers pending words (with a vote count and who asked, most
requested first) and leagues (reassign the admin to any existing member —
the server rejects non-members, which would otherwise leave a league
controlled by someone who cannot see it).

## 2026-08-09 — Tile reveal animation

Tiles now flip when a guess is submitted, staggered left to right, with the
direction drawn at random per tile from four variants (rotateX up/down,
rotateY left/right) so a row never reveals the same way twice.

How the colour swap hides: the tile changes colour at the 50% keyframe, the
exact moment it is edge-on at 90° and therefore invisible. One set of
keyframes serves all three result colours by reading `--tile-bg`, set inline
per tile, instead of writing green/yellow/grey copies of each variant.

Details worth keeping:

- `animation-fill-mode: both` plus a per-tile `animation-delay` means a tile
  holds the *pre-reveal* look during its stagger delay. Without it, later
  tiles would flash their result colour before flipping, which gives the
  answer away.
- The flip directions live in state rather than being computed at render
  time; recomputing them would redraw the directions on every re-render
  mid-animation.
- The end-of-game panel is now gated on the reveal finishing. It used to be
  driven straight off status, so "¡Bien hecho!" would appear while tiles were
  still turning and spoil the last one.
- The row needs `perspective`, or rotateX/rotateY read as a vertical squash
  rather than a flip in depth.
- Honours `prefers-reduced-motion`, which skips the animation and shows the
  final colours immediately.

Timing is 300ms per tile with a 55ms stagger (520ms total). `FLIP_MS` in
`GameBoard.jsx` has to stay in sync with `.tile-reveal` in `index.css`.

## 2026-08-09 — Accepted words can be removed again

Approving a word was one-way: it went into `extra_words` and nothing in the
panel could take it back out. Added a "Palabras aceptadas" tab listing the
manually accepted words with a Quitar action, backed by
`GET/DELETE /api/admin/words`.

Removing sets the word's suggestions to 'rejected' rather than leaving them
'approved', so the record cannot claim a word was accepted while the word no
longer works. Another player proposing it later creates a fresh pending row,
which reopens the question deliberately.

Only manually added words can be removed this way. Words from the generated
list are not in `extra_words`, so taking one of those out still means editing
the build script and regenerating — the tab says so.

## 2026-08-09 — Spanish error messages

Reported: rejecting an unknown word said "Not a word in the dictionary".
Every user-facing string in the app was English; the game text had been
written in Spanish but the error paths never were.

Translated all 19 Worker error strings, and three other sources of English
that would have surfaced the same way:

- Firebase auth errors were shown raw (`Firebase: Error
  (auth/invalid-credential).`) on the login screen — the first thing a new
  player sees. Now mapped by error code to Spanish, with a generic fallback
  for codes not in the map.
- `apiFetch` fell back to `Request failed: 500` when a response had no JSON
  body, and a network failure surfaced as the browser's own English
  `TypeError`. Both now produce Spanish.
- Token verification failures no longer leak the reason to the client, so
  the detail is written to the Worker log instead — otherwise translating
  the message would have thrown away the only diagnostic.
