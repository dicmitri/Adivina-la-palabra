import { HttpError } from "./http.js";

// Site admins are listed by Firebase uid in the ADMIN_UIDS var. Uid rather
// than email on purpose: email/password signup does not verify the address,
// so anyone could register with an admin's email and inherit their powers.
// A uid is assigned by Firebase and cannot be chosen.
export function isSiteAdmin(env, uid) {
  const allowed = (env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(uid);
}

export function requireSiteAdmin(env, user) {
  if (!isSiteAdmin(env, user.uid)) throw new HttpError(403, "No tienes permisos de administrador");
}
