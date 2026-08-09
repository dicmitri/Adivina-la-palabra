import { json } from "../lib/http.js";
import { isSiteAdmin } from "../lib/admin.js";

export async function getMe(request, env, { user }) {
  const profile = await env.DB.prepare("SELECT id, username, created_at FROM users WHERE id = ?")
    .bind(user.uid)
    .first();
  return json({
    uid: user.uid,
    email: user.email,
    profile: profile ?? null,
    isAdmin: isSiteAdmin(env, user.uid),
  });
}

export async function createProfile(request, env, { user }) {
  const body = await request.json().catch(() => ({}));
  const username = (body.username || "").trim();
  if (!username || username.length > 20) {
    return json({ error: "El usuario debe tener entre 1 y 20 caracteres" }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(user.uid).first();
  if (existing) return json({ error: "Ya tienes un perfil creado" }, { status: 409 });

  try {
    await env.DB.prepare("INSERT INTO users (id, username) VALUES (?, ?)").bind(user.uid, username).run();
  } catch (err) {
    return json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
  }
  return json({ uid: user.uid, username });
}
