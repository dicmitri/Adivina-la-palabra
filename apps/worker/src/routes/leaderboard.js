import { json } from "../lib/http.js";
import { requireMembership } from "../lib/leagues.js";
import { getDailyKey, getRoundKey } from "../lib/gameLogic.js";

export async function getLeaderboard(request, env, { user, params }) {
  const league = await requireMembership(env, params.id, user.uid);
  const url = new URL(request.url);
  const view = url.searchParams.get("view") === "period" ? "period" : "daily";

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
    return json({ view, key: dailyKey, scores: results });
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
  return json({ view, key: roundKey, scores: results });
}
