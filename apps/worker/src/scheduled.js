import { getRoundBoundaries, getRoundKey } from "./lib/gameLogic.js";

const MAX_ROUNDS_PER_RUN = 20; // safety cap when catching up a long-idle league

export async function processRoundWinners(env) {
  const now = new Date();
  const { results: leagues } = await env.DB.prepare(
    "SELECT id, frequency, created_at, last_processed_round_end FROM leagues"
  ).all();

  for (const league of leagues) {
    await processLeague(env, league, now);
  }
}

async function processLeague(env, league, now) {
  let cursor = league.last_processed_round_end
    ? new Date(new Date(league.last_processed_round_end).getTime() + 1)
    : new Date(league.created_at);

  for (let i = 0; i < MAX_ROUNDS_PER_RUN; i++) {
    const boundaries = getRoundBoundaries(cursor, league.frequency);
    if (!boundaries || boundaries.end >= now) break;

    const roundKey = getRoundKey(league.frequency, boundaries.start);
    const top = await env.DB.prepare(
      "SELECT user_id FROM round_scores WHERE league_id = ? AND round_key = ? ORDER BY score DESC LIMIT 1"
    )
      .bind(league.id, roundKey)
      .first();

    if (top) {
      await env.DB.prepare(
        `INSERT INTO round_wins (league_id, user_id, wins) VALUES (?, ?, 1)
         ON CONFLICT (league_id, user_id) DO UPDATE SET wins = wins + 1`
      )
        .bind(league.id, top.user_id)
        .run();
    }

    await env.DB.prepare("UPDATE leagues SET last_processed_round_end = ? WHERE id = ?")
      .bind(boundaries.end.toISOString(), league.id)
      .run();

    cursor = new Date(boundaries.end.getTime() + 1);
  }
}
