import { verifyFirebaseToken } from "./verifyFirebaseToken.js";
import { HttpError } from "./http.js";

export async function requireUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Sesión no válida, vuelve a entrar");
  }
  try {
    const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    return { uid: payload.sub, email: payload.email };
  } catch (err) {
    // The player gets a plain message; the actual reason (bad signature,
    // wrong audience, clock skew...) stays in the Worker logs.
    console.error("Token verification failed:", err.message);
    throw new HttpError(401, "Tu sesión ha caducado, vuelve a entrar");
  }
}
