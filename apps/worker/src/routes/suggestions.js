import { json } from "../lib/http.js";
import { normalizeWord } from "../lib/gameLogic.js";
import { isSuggestable } from "../lib/words.js";

// Beyond needing an account, this is the throttle: a player can put forward
// a handful of words a day, which is far more than honest use needs and far
// less than is worth abusing.
const MAX_PER_DAY = 10;

export async function suggestWord(request, env, { user }) {
  const body = await request.json().catch(() => ({}));
  const word = normalizeWord(body.word || "");

  if (!(await isSuggestable(env, word))) {
    return json({ error: "Esa palabra no se puede proponer" }, { status: 400 });
  }

  const { count } = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM word_suggestions WHERE user_id = ? AND created_at >= ?"
  )
    .bind(user.uid, new Date(Date.now() - 86400000).toISOString())
    .first();

  if (count >= MAX_PER_DAY) {
    return json({ error: "Has propuesto demasiadas palabras hoy. Inténtalo mañana." }, { status: 429 });
  }

  // Re-suggesting a word you already sent is a no-op rather than an error —
  // from the player's point of view it worked either way.
  await env.DB.prepare(
    `INSERT INTO word_suggestions (word, user_id) VALUES (?, ?)
     ON CONFLICT (word, user_id) DO NOTHING`
  )
    .bind(word, user.uid)
    .run();

  return json({ ok: true, word });
}
