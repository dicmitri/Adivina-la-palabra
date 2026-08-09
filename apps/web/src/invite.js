// Invite links: /?liga=ABC123
//
// The code has to survive the trip through signing up and choosing a
// username, which is several screens, so it is parked in sessionStorage as
// soon as it is seen. sessionStorage rather than localStorage: an invite is
// for this visit, and a forgotten code silently joining a league weeks later
// would be surprising.

const PARAM = "liga";
const KEY = "pendingInvite";

export function inviteUrl(code) {
  return `${window.location.origin}/?${PARAM}=${encodeURIComponent(code)}`;
}

// Reads the code from the URL (remembering it) or from a previous read in
// this same visit. Also strips the parameter from the address bar, so a
// refresh after joining does not look like a fresh invite.
export function readInviteCode() {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get(PARAM);

  if (fromUrl) {
    const code = fromUrl.trim().toUpperCase();
    sessionStorage.setItem(KEY, code);
    url.searchParams.delete(PARAM);
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return code;
  }
  return sessionStorage.getItem(KEY);
}

export function clearInviteCode() {
  sessionStorage.removeItem(KEY);
}
