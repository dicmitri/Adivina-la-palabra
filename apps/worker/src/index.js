import { verifyFirebaseToken } from "./verifyFirebaseToken.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

async function requireUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new Response(json({ error: "Missing bearer token" }, { status: 401 }));
  }
  try {
    const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    return { uid: payload.sub, email: payload.email };
  } catch (err) {
    throw new Response(json({ error: "Invalid token", detail: err.message }, { status: 401 }));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/me") {
      let user;
      try {
        user = await requireUser(request, env);
      } catch (response) {
        return response;
      }

      const row = await env.DB.prepare("SELECT id, username, created_at FROM users WHERE id = ?")
        .bind(user.uid)
        .first();

      return json({ uid: user.uid, email: user.email, profile: row ?? null });
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};
