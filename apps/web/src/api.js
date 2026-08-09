const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, { user, ...options } = {}) {
  const headers = { ...options.headers };
  if (user) {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    // fetch only rejects on network failure, never on an HTTP error status.
    throw new Error("Sin conexión con el servidor. Comprueba tu internet.");
  }
  if (!res.ok) {
    // The API sends Spanish messages; the fallback covers responses that
    // never reached it (a proxy error page, say) and so have no JSON body.
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Error del servidor (${res.status}). Inténtalo de nuevo.`);
    // Callers sometimes need more than the message (e.g. whether a rejected
    // word may be proposed for the dictionary).
    err.body = body;
    err.status = res.status;
    throw err;
  }
  return res.json();
}
