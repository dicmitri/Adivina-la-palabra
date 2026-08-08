import { verifyFirebaseToken } from "./verifyFirebaseToken.js";
import { HttpError } from "./http.js";

export async function requireUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Missing bearer token");
  }
  try {
    const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    return { uid: payload.sub, email: payload.email };
  } catch (err) {
    throw new HttpError(401, `Invalid token: ${err.message}`);
  }
}
