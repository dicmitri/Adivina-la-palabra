import { json, HttpError } from "../lib/http.js";
import { requireSiteAdmin } from "../lib/admin.js";

// Pending words, most-requested first, with who asked. The count of distinct
// players wanting a word is the main thing to judge it by.
export async function listSuggestions(request, env, { user }) {
  requireSiteAdmin(env, user);
  const { results } = await env.DB.prepare(
    `SELECT ws.word,
            COUNT(*) AS votes,
            GROUP_CONCAT(u.username, ', ') AS suggestedBy,
            MIN(ws.created_at) AS firstSuggestedAt
     FROM word_suggestions ws
     JOIN users u ON u.id = ws.user_id
     WHERE ws.status = 'pending'
     GROUP BY ws.word
     ORDER BY votes DESC, firstSuggestedAt ASC
     LIMIT 200`
  ).all();
  return json({ suggestions: results });
}

export async function decideSuggestion(request, env, { user, params }) {
  requireSiteAdmin(env, user);
  const body = await request.json().catch(() => ({}));
  const word = params.word.toUpperCase();

  if (body.decision !== "approve" && body.decision !== "reject") {
    throw new HttpError(400, "Decisión no válida");
  }

  if (body.decision === "approve") {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO extra_words (word, approved_by) VALUES (?, ?)
         ON CONFLICT (word) DO NOTHING`
      ).bind(word, user.uid),
      env.DB.prepare("UPDATE word_suggestions SET status = 'approved' WHERE word = ?").bind(word),
    ]);
  } else {
    await env.DB.prepare("UPDATE word_suggestions SET status = 'rejected' WHERE word = ?")
      .bind(word)
      .run();
  }
  return json({ ok: true, word, decision: body.decision });
}

export async function listAllLeagues(request, env, { user }) {
  requireSiteAdmin(env, user);
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.frequency, l.invite_code AS inviteCode,
            l.admin_id AS adminId, u.username AS adminUsername,
            (SELECT COUNT(*) FROM league_members m WHERE m.league_id = l.id) AS members,
            l.created_at AS createdAt
     FROM leagues l
     JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT 200`
  ).all();
  return json({ leagues: results });
}

export async function listLeagueMembers(request, env, { user, params }) {
  requireSiteAdmin(env, user);
  const { results } = await env.DB.prepare(
    `SELECT u.id AS userId, u.username
     FROM league_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.league_id = ?
     ORDER BY m.joined_at ASC`
  )
    .bind(params.id)
    .all();
  return json({ members: results });
}

export async function setLeagueAdmin(request, env, { user, params }) {
  requireSiteAdmin(env, user);
  const body = await request.json().catch(() => ({}));
  const newAdminId = body.adminId;

  // The new admin has to already be in the league, otherwise the league ends
  // up controlled by someone who cannot see it.
  const member = await env.DB.prepare(
    "SELECT 1 FROM league_members WHERE league_id = ? AND user_id = ?"
  )
    .bind(params.id, newAdminId)
    .first();
  if (!member) throw new HttpError(400, "Esa persona no es miembro de la liga");

  await env.DB.prepare("UPDATE leagues SET admin_id = ? WHERE id = ?")
    .bind(newAdminId, params.id)
    .run();
  return json({ ok: true });
}
