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

## One-time setup

1. **Firebase project** (Auth only): create a new Firebase project in the
   console, enable Authentication → Email/Password (or whichever providers
   you want), and copy the Web app config into `apps/web/.env` (copy from
   `.env.example`). Do not enable Firestore/Storage/Functions on this
   project — it exists only for Auth.
2. **Cloudflare D1**: `npx wrangler d1 create adivina-la-palabra`, then paste
   the returned `database_id` into `apps/worker/wrangler.toml`. Run the
   schema with `npm run db:migrate:local` (and `:remote` once deployed).
3. **Worker env**: copy `apps/worker/.dev.vars.example` to
   `apps/worker/.dev.vars` and fill in `FIREBASE_PROJECT_ID` (also set the
   same value in `wrangler.toml`'s `[vars]` for the deployed environment).
4. **Cloudflare Pages**: connect this repo, set the build directory to
   `apps/web`, build command `npm run build`, output directory `dist`. Add
   the `VITE_FIREBASE_*` and `VITE_API_BASE_URL` env vars in the Pages
   project settings (pointing at the deployed Worker's URL).

## Local dev

```
npm install
npm run dev:worker   # Cloudflare Worker on http://localhost:8787
npm run dev:web      # Vite dev server
```

## Deploy

```
npm run deploy:worker         # Worker
# Pages deploys automatically on push once connected in step 4 above
```

## Status

Scaffold only: login (Firebase Auth) wired end-to-end to a protected
`/api/me` Worker route backed by D1. No game logic yet.
