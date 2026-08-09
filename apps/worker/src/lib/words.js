import { isValidWord, normalizeWord, WORD_LENGTH } from "./gameLogic.js";

// A guess is accepted if it is in the bundled list or has been approved by an
// admin since the last deploy. The D1 lookup only happens on the miss path,
// so the common case stays a single in-memory Set check.
export async function isGuessable(env, word) {
  if (isValidWord(word)) return true;
  const row = await env.DB.prepare("SELECT 1 FROM extra_words WHERE word = ?")
    .bind(normalizeWord(word))
    .first();
  return Boolean(row);
}

// Only a well-formed word that is genuinely missing can be suggested. This is
// most of the spam protection: junk, wrong lengths, and words that already
// work are all rejected before anything is written.
export async function isSuggestable(env, word) {
  const norm = normalizeWord(word);
  if (norm.length !== WORD_LENGTH) return false;
  if (!/^[A-ZÑ]+$/.test(norm)) return false;
  return !(await isGuessable(env, norm));
}
