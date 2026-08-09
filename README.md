# Adivina la Palabra (public)

Fresh, independent rebuild of the word-guessing game for public use. Separate
repo and architecture from the family league app (`dicmitri/Adivina`) —
deliberately not sharing code or constraints with it.

## Architecture

- **Hosting**: Cloudflare Pages (`apps/web`, React + Vite + Tailwind)
- **API**: Cloudflare Workers (`apps/worker`) — all game logic (secret word,
  scoring, league admin) runs here, never in the browser
- **Database**: Cloudflare D1
- **Auth**: Firebase Authentication (used for login/session only — no
  Firestore, no other Firebase product). The Worker verifies Firebase ID
  tokens itself (`apps/worker/src/verifyFirebaseToken.js`) against Google's
  public keys, so there's no Firebase Admin SDK / server dependency on
  Firebase.

Both Cloudflare Pages and Workers stay on Cloudflare's free tier (no card on
file), same as Firebase Auth's free tier — so there's no path to a surprise
bill on either side.

## Live environment

| Piece | Where |
| --- | --- |
| Site | https://adivina-la-palabra.pages.dev |
| API (Worker) | https://adivina-la-palabra-api.ristlincin.workers.dev |
| Database | Cloudflare D1 `adivina-la-palabra` |
| Auth | Firebase project `adivina-la-palabra-ligas` (Auth only) |

## Deployment

Everything deploys from GitHub Actions on push to `main` — the Worker,
the D1 schema, and the Pages site. Two repo secrets drive it:
`CLOUDFLARE_API_TOKEN` (needs **D1:Edit**, **Workers Scripts:Edit** and
**Pages:Edit** — all three) and `CLOUDFLARE_ACCOUNT_ID` (required; without
it wrangler tries a `/memberships` lookup that a scoped token cannot do).

`.github/workflows/cloudflare-setup.yml` provisions the D1 database and
Pages project. It is idempotent and only needs re-running if those are
deleted.

The frontend's API base URL is not configured anywhere — the deploy
workflow captures it from the Worker deploy output and passes it to the
web build, so it cannot drift.

## Local dev

```
npm install
cp apps/web/.env.example apps/web/.env            # fill in Firebase web config
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
npm run dev:worker   # Worker on http://localhost:8787
npm run dev:web      # Vite dev server
```

The Firebase web config values (apiKey/authDomain/projectId) are public by
design and also live in `.github/workflows/deploy.yml`.

## Status

Deployed and reachable: the Worker serves `/api/health`, rejects
unauthenticated calls, and is bound to D1. The full browser flow
(signup → create league → guess → leaderboard) has not been exercised
against the live stack yet.
