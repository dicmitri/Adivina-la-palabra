const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, { user, ...options } = {}) {
  const headers = { ...options.headers };
  if (user) {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
