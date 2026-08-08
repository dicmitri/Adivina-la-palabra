import { HttpError } from "./http.js";

export async function requireMembership(env, leagueId, userId) {
  const league = await env.DB.prepare(
    `SELECT l.id, l.name, l.frequency, l.admin_id, l.invite_code
     FROM leagues l
     JOIN league_members m ON m.league_id = l.id
     WHERE l.id = ? AND m.user_id = ?`
  )
    .bind(leagueId, userId)
    .first();
  if (!league) throw new HttpError(403, "Not a member of this league");
  return league;
}

export async function requireAdmin(env, leagueId, userId) {
  const league = await env.DB.prepare("SELECT * FROM leagues WHERE id = ?").bind(leagueId).first();
  if (!league) throw new HttpError(404, "League not found");
  if (league.admin_id !== userId) throw new HttpError(403, "Admin only");
  return league;
}
