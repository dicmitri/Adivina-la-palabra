export function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

// Excludes visually ambiguous characters (0/O, 1/I/L).
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("");
}
