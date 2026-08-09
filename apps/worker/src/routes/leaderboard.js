import { json } from "../lib/http.js";
import { requireMembership } from "../lib/leagues.js";
import { getDailyKey, getRoundKey } from "../lib/gameLogic.js";

// Whoever topped yesterday's board, so the UI can mark them. Requires a
// score above zero — on a day nobody solved the word, nobody won it.
async function yesterdayWinnerId(env, leagueId) {
  const yesterday = getDailyKey(new Date(Date.now() - 86400000));
  const row = await env.DB.prepare(
    `SELECT user_id FROM daily_attempts
     WHERE league_id = ? AND date = ? AND score > 0
     ORDER BY score DESC LIMIT 1`
  )
    .bind(leagueId, yesterday)
    .first();
  return row ? row.user_id : null;
}

export async function getLeaderboard(request, env, { user, params }) {
  const league = await requireMembership(env, params.id, user.uid);
  const url = new URL(request.url);
  const view = url.searchParams.get("view") === "period" ? "period" : "daily";

  const yesterdayWinner = await yesterdayWinnerId(env, params.id);

  if (view === "daily") {
    const dailyKey = getDailyKey();
    const { results } = await env.DB.prepare(
      `SELECT da.user_id AS userId, u.username, da.score
       FROM daily_attempts da
       JOIN users u ON u.id = da.user_id
       WHERE da.league_id = ? AND da.date = ?
       ORDER BY da.score DESC
       LIMIT 20`
    )
      .bind(params.id, dailyKey)
      .all();
    return json({ view, key: dailyKey, scores: results, yesterdayWinner });
  }

  const roundKey = getRoundKey(league.frequency, new Date());
  const { results } = await env.DB.prepare(
    `SELECT rs.user_id AS userId, u.username, rs.score, COALESCE(rw.wins, 0) AS roundWins
     FROM round_scores rs
     JOIN users u ON u.id = rs.user_id
     LEFT JOIN round_wins rw ON rw.league_id = rs.league_id AND rw.user_id = rs.user_id
     WHERE rs.league_id = ? AND rs.round_key = ?
     ORDER BY rs.score DESC
     LIMIT 20`
  )
    .bind(params.id, roundKey)
    .all();
  return json({ view, key: roundKey, scores: results, yesterdayWinner });
}
