// Verifies a Firebase Auth ID token inside a Cloudflare Worker, without the
// (Node-only) Firebase Admin SDK. Mirrors what the Admin SDK checks server-side:
// signature against Google's published keys, expiry, issuer, and audience.

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let jwksCache = { keys: null, fetchedAt: 0 };

function base64UrlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(b64url) {
  return new TextDecoder().decode(base64UrlToUint8Array(b64url));
}

async function getJwks() {
  const isStale = Date.now() - jwksCache.fetchedAt > JWKS_CACHE_TTL_MS;
  if (!jwksCache.keys || isStale) {
    const res = await fetch(JWKS_URL);
    if (!res.ok) throw new Error(`Failed to fetch Firebase JWKS: ${res.status}`);
    const { keys } = await res.json();
    jwksCache = { keys, fetchedAt: Date.now() };
  }
  return jwksCache.keys;
}

// Returns the decoded token payload (includes `sub`, the Firebase uid) if
// valid, otherwise throws.
export async function verifyFirebaseToken(idToken, projectId) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecodeToString(headerB64));
  const payload = JSON.parse(base64UrlDecodeToString(payloadB64));

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unexpected token header");
  }

  const keys = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("No matching signing key");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = base64UrlToUint8Array(sigB64);
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signedData
  );
  if (!validSignature) throw new Error("Invalid signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error("Token expired");
  if (payload.iat > now + 60) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error("Unexpected audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Unexpected issuer");
  }
  if (!payload.sub) throw new Error("Missing subject");

  return payload;
}
