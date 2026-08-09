# Architecture

This document is written for humans, not just for AI agents working on the
code. If you're curious what this project is, how it's built, and where
it's headed, this is the place to look.

## The idea

Adivina la Palabra is a word-guessing game: every day there's a secret word,
and players get a limited number of guesses to find it, with feedback after
each guess (like the letter is right but in the wrong place). Players group
into **leagues** — small competitive groups, like a group chat but for the
game — and the app tracks scores and hands out trophies to whoever wins each
round.

This repository is a **from-scratch rebuild of that idea for public use**.
There's a sibling project, the original family league app, that already
proves the core game is fun and works — but that app was built for a small
group of trusted family members, with the game's logic running in the
player's own browser. That's fine for family, on the honor system. It's not
fine for the public internet, where anyone can open their browser's dev
tools and read the secret word straight out of the page before typing a
single letter. This project exists to do it properly: the secret word never
leaves the server, and the server decides who guessed right.

## The stack, in plain terms

- **Cloudflare Pages** serves the website itself (the part you see and
  click on) — built with React.
- **Cloudflare Workers** is the "brain" — a small program that runs on
  Cloudflare's servers, holds the secret word, and decides whether a guess
  is right. The browser never gets the word; it only gets the game's
  reaction to a guess.
- **Cloudflare D1** is the database — where leagues, scores, and usernames
  are stored.
- **Firebase Authentication** handles logging in and creating accounts.
  This is the *only* piece not on Cloudflare, and on purpose: building a
  secure login system from scratch (passwords, resets, sessions) is a lot
  of risk for very little benefit when a free, well-tested option already
  exists. Nothing else about the game touches Firebase — no game data lives
  there, only "who is this person."

All of these have a free tier that doesn't require a credit card on file,
which was a deliberate choice: there's no way for a traffic spike, an
attack, or a bug to ever generate a surprise bill. Worst case, the free
tier's limit is hit and the app is briefly unavailable — never a charge.

## How the code is organized

This is a monorepo — one repository, two apps that deploy separately:

```
apps/
  web/      the website (React + Vite + Tailwind), deployed to Cloudflare Pages
  worker/   the API (Cloudflare Worker), deployed to Cloudflare Workers, talks to D1
```

They're split because they scale and deploy independently, but live together
so a change that touches both (say, a new field returned by the API and
used by the UI) is one commit, not a coordinated release across two repos.

## Direction

**v1** is functionally the same game as the family app — daily secret word,
create/join leagues, leaderboards, trophies — rebuilt so the server is
always the authority on the secret word and on scoring. Nothing clever or
new yet; the goal is a public-safe version of what's already proven to be
fun.

**Planned next**, once v1 is solid:

- **Public leagues at scale.** The family app was built for a handful of
  small, private groups. This version's database and query design assume
  many concurrent leagues and thousands of players, not dozens — so growth
  doesn't require a redesign later.
- ~~**Social sharing and invite links.**~~ Done. Finishing a game offers a
  shareable emoji grid, and every league has a join link (`/?liga=CODE`)
  that carries a new player through signing up and drops them straight
  into the league.

Anything beyond that (other languages, monetization, new game modes) is
intentionally undecided — this document will be updated when those become
real plans, not before.

## Relationship to the family app

This project doesn't share code, a database, or a deployment with the
family app, and isn't trying to stay compatible with it. The family app was
useful as proof that the core game works — nothing more. Where diverging
from it produces a better public product (different data model, different
framework choices, different feature set), that's not just allowed, it's
expected.
