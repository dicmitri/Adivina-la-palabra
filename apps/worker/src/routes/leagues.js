import { json } from "../lib/http.js";
import { generateId, generateInviteCode } from "../lib/ids.js";
import { requireAdmin } from "../lib/leagues.js";

const FREQUENCIES = ["daily", "weekly", "quarterly"];

export async function createLeague(request, env, { user }) {
  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const frequency = body.frequency;
  if (!name || name.length > 40) return json({ error: "Invalid name" }, { status: 400 });
  if (!FREQUENCIES.includes(frequency)) return json({ error: "Invalid frequency" }, { status: 400 });

  const id = generateId("league");
  let inviteCode = null;
  for (let attempt = 0; attempt < 5 && !inviteCode; attempt++) {
    const candidate = generateInviteCode();
    try {
      // Batched so a league can never exist without its admin as a member —
      // an orphaned league would be invisible to every query but would still
      // hold its invite_code.
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO leagues (id, name, admin_id, frequency, invite_code) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, name, user.uid, frequency, candidate),
        env.DB.prepare("INSERT INTO league_members (league_id, user_id) VALUES (?, ?)").bind(id, user.uid),
      ]);
      inviteCode = candidate;
    } catch (err) {
      // Only an invite_code collision is worth retrying; anything else is a
      // real failure and must not be reported as "try again".
      if (!/UNIQUE constraint failed: leagues\.invite_code/i.test(err.message)) throw err;
    }
  }
  if (!inviteCode) return json({ error: "Could not allocate an invite code, try again" }, { status: 503 });

  return json({ id, name, frequency, inviteCode, adminId: user.uid });
}

export async function joinLeague(request, env, { user }) {
  const body = await request.json().catch(() => ({}));
  const inviteCode = (body.inviteCode || "").trim().toUpperCase();
  const league = await env.DB.prepare("SELECT id, name, frequency FROM leagues WHERE invite_code = ?")
    .bind(inviteCode)
    .first();
  if (!league) return json({ error: "No league with that invite code" }, { status: 404 });

  await env.DB.prepare(
    "INSERT INTO league_members (league_id, user_id) VALUES (?, ?) ON CONFLICT (league_id, user_id) DO NOTHING"
  )
    .bind(league.id, user.uid)
    .run();

  return json(league);
}

export async function listMyLeagues(request, env, { user }) {
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.frequency, l.admin_id AS adminId, l.invite_code AS inviteCode
     FROM leagues l
     JOIN league_members m ON m.league_id = l.id
     WHERE m.user_id = ?
     ORDER BY m.joined_at ASC`
  )
    .bind(user.uid)
    .all();
  return json({ leagues: results });
}

export async function updateLeague(request, env, { user, params }) {
  await requireAdmin(env, params.id, user.uid);

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];
  if (typeof body.name === "string" && body.name.trim()) {
    updates.push("name = ?");
    values.push(body.name.trim().slice(0, 40));
  }
  if (FREQUENCIES.includes(body.frequency)) {
    updates.push("frequency = ?");
    values.push(body.frequency);
  }
  if (!updates.length) return json({ error: "Nothing to update" }, { status: 400 });

  values.push(params.id);
  await env.DB.prepare(`UPDATE leagues SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  return json({ ok: true });
}

export async function deleteLeague(request, env, { user, params }) {
  await requireAdmin(env, params.id, user.uid);

  const id = params.id;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM daily_attempts WHERE league_id = ?").bind(id),
    env.DB.prepare("DELETE FROM round_scores WHERE league_id = ?").bind(id),
    env.DB.prepare("DELETE FROM round_wins WHERE league_id = ?").bind(id),
    env.DB.prepare("DELETE FROM league_members WHERE league_id = ?").bind(id),
    env.DB.prepare("DELETE FROM leagues WHERE id = ?").bind(id),
  ]);
  return json({ ok: true });
}
