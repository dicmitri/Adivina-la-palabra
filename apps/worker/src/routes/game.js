import { json } from "../lib/http.js";
import { requireMembership } from "../lib/leagues.js";
import {
  normalizeWord,
  isValidWord,
  checkGuess,
  calculateScore,
  getTargetWord,
  getDailyKey,
  getRoundKey,
  WORD_LENGTH,
  MAX_ATTEMPTS,
} from "../lib/gameLogic.js";

export async function getToday(request, env, { user, params }) {
  await requireMembership(env, params.id, user.uid);
  const dailyKey = getDailyKey();

  const row = await env.DB.prepare(
    "SELECT guesses_json, status, score FROM daily_attempts WHERE league_id = ? AND user_id = ? AND date = ?"
  )
    .bind(params.id, user.uid, dailyKey)
    .first();

  if (!row) return json({ date: dailyKey, guesses: [], feedback: [], status: "playing", score: 0 });

  const guesses = JSON.parse(row.guesses_json);
  const target = getTargetWord(params.id, dailyKey);
  const response = {
    date: dailyKey,
    guesses,
    // Per-letter feedback for every past guess, so a page reload mid-round
    // can redraw the board without needing the word itself.
    feedback: guesses.map((g) => checkGuess(g, target)),
    status: row.status,
    score: row.score,
  };
  // Only reveal the word once the round is actually over.
  if (row.status !== "playing") {
    response.word = target;
  }
  return json(response);
}

export async function submitGuess(request, env, { user, params }) {
  const league = await requireMembership(env, params.id, user.uid);
  const body = await request.json().catch(() => ({}));
  const guess = normalizeWord(body.guess || "");

  if (guess.length !== WORD_LENGTH) return json({ error: "La palabra debe tener 5 letras" }, { status: 400 });
  if (!isValidWord(guess)) return json({ error: "Esa palabra no está en el diccionario" }, { status: 400 });

  const dailyKey = getDailyKey();
  const target = getTargetWord(params.id, dailyKey);

  const existing = await env.DB.prepare(
    "SELECT guesses_json, status FROM daily_attempts WHERE league_id = ? AND user_id = ? AND date = ?"
  )
    .bind(params.id, user.uid, dailyKey)
    .first();

  if (existing && existing.status !== "playing") {
    return json({ error: "Ya has terminado la partida de hoy" }, { status: 409 });
  }

  const guesses = existing ? JSON.parse(existing.guesses_json) : [];
  if (guesses.length >= MAX_ATTEMPTS) {
    return json({ error: "No te quedan intentos" }, { status: 409 });
  }
  guesses.push(guess);

  let status = "playing";
  let score = 0;
  if (guess === target) {
    status = "won";
    score = calculateScore(guesses.length - 1);
  } else if (guesses.length >= MAX_ATTEMPTS) {
    status = "lost";
  }

  const guessesJson = JSON.stringify(guesses);
  if (existing) {
    await env.DB.prepare(
      "UPDATE daily_attempts SET guesses_json = ?, status = ?, score = ? WHERE league_id = ? AND user_id = ? AND date = ?"
    )
      .bind(guessesJson, status, score, params.id, user.uid, dailyKey)
      .run();
  } else {
    await env.DB.prepare(
      "INSERT INTO daily_attempts (league_id, user_id, date, guesses_json, status, score) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(params.id, user.uid, dailyKey, guessesJson, status, score)
      .run();
  }

  if (status === "won") {
    const roundKey = getRoundKey(league.frequency, new Date());
    await env.DB.prepare(
      `INSERT INTO round_scores (league_id, round_key, user_id, score) VALUES (?, ?, ?, ?)
       ON CONFLICT (league_id, round_key, user_id) DO UPDATE SET score = score + excluded.score`
    )
      .bind(params.id, roundKey, user.uid, score)
      .run();
  }

  const result = {
    guesses,
    feedback: guesses.map((g) => checkGuess(g, target)),
    status,
    score,
  };
  if (status !== "playing") result.word = target;
  return json(result);
}
