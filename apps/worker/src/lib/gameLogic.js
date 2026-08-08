import dictionaryRaw from "./dictionary.json";

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

const dictionary = dictionaryRaw.filter((w) => w.length === WORD_LENGTH);
const SCORES = { 0: 20, 1: 15, 2: 10, 3: 7, 4: 5, 5: 2 };

export const normalizeWord = (word) => {
  if (!word) return "";
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
};

export const calculateScore = (attemptIndex) => SCORES[attemptIndex] ?? 0;

export const isValidWord = (word) => {
  const norm = normalizeWord(word);
  return dictionary.some((d) => normalizeWord(d) === norm);
};

export const checkGuess = (guess, target) => {
  const guessArr = normalizeWord(guess).split("");
  const targetArr = normalizeWord(target).split("");
  const result = new Array(WORD_LENGTH).fill("absent");
  const targetCounts = {};

  targetArr.forEach((c) => {
    targetCounts[c] = (targetCounts[c] || 0) + 1;
  });
  guessArr.forEach((c, i) => {
    if (c === targetArr[i]) {
      result[i] = "correct";
      targetCounts[c]--;
    }
  });
  guessArr.forEach((c, i) => {
    if (result[i] !== "correct" && targetCounts[c] > 0) {
      result[i] = "present";
      targetCounts[c]--;
    }
  });
  return result;
};

export const getDailyKey = (date = new Date()) => date.toISOString().split("T")[0];

const getISOWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
};

export const getRoundKey = (frequency, date = new Date()) => {
  if (frequency === "weekly") return getISOWeekKey(date);
  if (frequency === "quarterly") {
    return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  }
  return getDailyKey(date);
};

// Start/end instants (UTC) of the round containing `date`.
export const getRoundBoundaries = (date, frequency) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  if (frequency === "daily") {
    const start = new Date(d);
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCMilliseconds(-1);
    return { start, end };
  }
  if (frequency === "weekly") {
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d);
    start.setUTCDate(diff);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    end.setUTCMilliseconds(-1);
    return { start, end };
  }
  if (frequency === "quarterly") {
    const quarter = Math.floor(d.getUTCMonth() / 3);
    const start = new Date(Date.UTC(d.getUTCFullYear(), quarter * 3, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1));
    end.setUTCMilliseconds(-1);
    return { start, end };
  }
  return null;
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Every league gets a different word on the same calendar day, by shifting
// which "virtual day" of the dictionary cycle it's looking at.
function seedForLeague(leagueId, dailyKey) {
  const offset = hashString(leagueId) % 1000;
  const d = new Date(`${dailyKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split("T")[0];
}

// The one function that decides the secret word. Runs only in this Worker —
// the dictionary this reads from is never bundled into the website.
export function getTargetWord(leagueId, dailyKey) {
  const seed = seedForLeague(leagueId, dailyKey);
  const index = hashString(seed) % dictionary.length;
  return normalizeWord(dictionary[index]);
}
