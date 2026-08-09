import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const FLIP_VARIANTS = ["up", "down", "right", "left"];
const STAGGER_MS = 55;
const FLIP_MS = 300; // keep in sync with .tile-reveal in index.css
const REVEAL_TOTAL_MS = STAGGER_MS * (WORD_LENGTH - 1) + FLIP_MS;

// Checked in JS rather than with a CSS media query so that skipping the
// animation also skips the delay before the end-of-game panel. Note some
// phones turn this on by themselves — Android battery saver does — which
// looks identical to the animation being broken.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function LetterTile({ char, status, reveal }) {
  const styles = {
    empty: "border-gray-300 bg-white text-black",
    typing: "border-gray-800 text-black",
    correct: "bg-green-500 border-green-500 text-white",
    present: "bg-yellow-500 border-yellow-500 text-white",
    absent: "bg-gray-500 border-gray-500 text-white",
  };
  // The turn and the tint are separate animations played together; combining
  // them here avoids a keyframe block per direction-and-colour pair.
  const animationStyle = reveal
    ? {
        animationName: `tile-turn-${reveal.variant}, tile-tint-${status}`,
        animationDelay: `${reveal.index * STAGGER_MS}ms`,
      }
    : undefined;

  return (
    <div
      style={animationStyle}
      className={`w-10 h-10 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-xl sm:text-2xl font-bold rounded ${styles[status] || styles.empty} ${reveal ? "tile-reveal" : ""}`}
    >
      {char}
    </div>
  );
}

function Keyboard({ onKey, letterStatus }) {
  const rows = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
  return (
    <div className="w-full max-w-lg mt-6 space-y-2 select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {row.split("").map((char) => (
            <button
              key={char}
              onClick={() => onKey(char)}
              className={`h-10 sm:h-12 flex-1 rounded font-bold text-xs sm:text-sm min-w-[28px] ${
                letterStatus[char] === "correct"
                  ? "bg-green-500 text-white"
                  : letterStatus[char] === "present"
                    ? "bg-yellow-500 text-white"
                    : letterStatus[char] === "absent"
                      ? "bg-gray-400 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-2">
        <button onClick={() => onKey("ENTER")} className="px-4 py-3 bg-gray-200 rounded font-bold text-xs">
          Probar
        </button>
        <button onClick={() => onKey("BACKSPACE")} className="px-4 py-3 bg-gray-200 rounded font-bold text-xs">
          ⌫
        </button>
      </div>
    </div>
  );
}

// Accepts a typed character if it is a Spanish letter, folding accented
// vowels onto their base letter (á → A) but leaving ñ alone, which mirrors
// how the server compares words.
function toGameLetter(key) {
  if (key.length !== 1) return null;
  const folded = key
    .normalize("NFD")
    .replace(/[\u0300-\u0302\u0304-\u036f]/g, "")
    .replace(/(?<!n)\u0303/gi, "")
    .normalize("NFC")
    .toUpperCase();
  return /^[A-Z\u00d1]$/.test(folded) ? folded : null;
}


const EMOJI = { correct: "🟩", present: "🟨", absent: "⬛" };

function buildShareText({ league, guesses, feedback, status, date }) {
  const grid = feedback.map((row) => row.map((s) => EMOJI[s] || "⬛").join("")).join("\n");
  const attempts = status === "won" ? guesses.length : "X";
  return [
    `Adivina la Palabra — ${league.name} (${date})`,
    `${attempts}/${MAX_ATTEMPTS}`,
    "",
    grid,
    "",
    window.location.origin,
  ].join("\n");
}

function buildLetterStatus(guesses, feedback) {
  const status = {};
  guesses.forEach((guess, i) => {
    guess.split("").forEach((c, j) => {
      const s = feedback[i]?.[j];
      if (s === "correct") status[c] = "correct";
      else if (s === "present" && status[c] !== "correct") status[c] = "present";
      else if (s === "absent" && !status[c]) status[c] = "absent";
    });
  });
  return status;
}

// `state` shape (matches both GET /today and POST /guess responses):
// { guesses: string[], feedback: string[][], status, score, word? }
export default function GameBoard({ league, user, onScoreChange }) {
  const [state, setState] = useState(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  // The word the server just rejected, offered back for the player to
  // propose. Cleared as soon as they type again.
  const [rejectedWord, setRejectedWord] = useState(null);
  // Which row is currently revealing, and the flip direction drawn for each
  // of its tiles. Held in state rather than computed at render time so the
  // directions stay put for the length of the animation instead of being
  // re-drawn on every re-render.
  const [reveal, setReveal] = useState(null);

  const guesses = state?.guesses || [];
  const feedback = state?.feedback || [];

  useEffect(() => {
    apiFetch(`/api/leagues/${league.id}/today`, { user }).then(setState);
  }, [league.id, user]);

  // Drop the reveal once it has played, which both releases the tiles back to
  // their plain classes and lets the end-of-game panel appear — showing it
  // mid-flip would give the result away before the last tile turns.
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setReveal(null), REVEAL_TOTAL_MS);
    return () => clearTimeout(t);
  }, [reveal]);

  const showMsg = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2000);
  };

  async function submitGuess() {
    if (loading || !state || state.status !== "playing") return;
    if (currentGuess.length !== WORD_LENGTH) return showMsg("¡Faltan letras!");

    setLoading(true);
    try {
      const result = await apiFetch(`/api/leagues/${league.id}/guess`, {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: currentGuess }),
      });
      setState(result);
      setCurrentGuess("");
      setRejectedWord(null);
      if (!prefersReducedMotion()) {
        setReveal({
          row: result.guesses.length - 1,
          variants: Array.from(
            { length: WORD_LENGTH },
            () => FLIP_VARIANTS[Math.floor(Math.random() * FLIP_VARIANTS.length)]
          ),
        });
      }
      if (result.status === "won") onScoreChange?.();
    } catch (err) {
      showMsg(err.message);
      setRejectedWord(err.body?.canSuggest ? err.body.word : null);
    } finally {
      setLoading(false);
    }
  }

  async function suggestWord() {
    const word = rejectedWord;
    setRejectedWord(null);
    try {
      await apiFetch("/api/suggestions", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      showMsg(`¡Gracias! Revisaremos "${word}".`);
    } catch (err) {
      showMsg(err.message);
    }
  }

  function handleKey(key) {
    if (!state || state.status !== "playing") return;
    if (key === "ENTER") return submitGuess();
    setRejectedWord(null);
    if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < WORD_LENGTH) setCurrentGuess((p) => p + key);
  }

  // Physical keyboard. Ignored while focus is in a text field, so typing a
  // league name or password does not also type into the board.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

      if (e.key === "Enter") return handleKey("ENTER");
      if (e.key === "Backspace") {
        e.preventDefault();
        return handleKey("BACKSPACE");
      }
      const letter = toGameLetter(e.key);
      if (letter) handleKey(letter);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function handleShare() {
    const text = buildShareText({
      league,
      guesses,
      feedback,
      status: state.status,
      date: state.date,
    });
    try {
      // Native share sheet on mobile (covers WhatsApp and everything else);
      // clipboard is the desktop fallback, where navigator.share is rare.
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showMsg("¡Resultado copiado!");
      }
    } catch (err) {
      if (err.name !== "AbortError") showMsg("No se pudo compartir");
    }
  }

  if (!state) return <div className="p-10 text-center">Cargando...</div>;

  const letterStatus = buildLetterStatus(guesses, feedback);

  return (
    <div className="w-full max-w-md bg-white p-4 rounded-xl shadow border mx-auto">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold">{league.name}</h2>
        {msg && <div className="text-red-500 font-bold text-sm">{msg}</div>}
        {rejectedWord && (
          <button
            onClick={suggestWord}
            className="text-xs text-blue-600 underline mt-1 hover:text-blue-800"
          >
            ¿Debería estarlo? Proponer «{rejectedWord}»
          </button>
        )}
      </div>

      <div className="grid gap-2 mb-2">
        {[...Array(MAX_ATTEMPTS)].map((_, i) => (
          <div key={i} className="flex justify-center gap-2 tile-row">
            {[...Array(WORD_LENGTH)].map((_, j) => {
              const guess = guesses[i];
              const isCurrent = i === guesses.length;
              const char = guess ? guess[j] : isCurrent ? currentGuess[j] : "";
              const st = guess ? feedback[i]?.[j] : isCurrent && char ? "typing" : "empty";
              // Only the row that was just submitted flips; earlier rows and a
              // reloaded board render straight to their final colours.
              const tileReveal =
                reveal?.row === i ? { variant: reveal.variants[j], index: j } : null;
              return <LetterTile key={j} char={char} status={st} reveal={tileReveal} />;
            })}
          </div>
        ))}
      </div>

      {state.status !== "playing" && !reveal && (
        <div
          className={`p-4 text-center rounded mb-4 ${state.status === "won" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          <h3 className="font-bold">{state.status === "won" ? "¡Bien hecho!" : "Ups, fallaste"}</h3>
          {state.word && <p>La palabra era: {state.word}</p>}
          <button
            onClick={handleShare}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700 transition-colors"
          >
            Compartir resultado
          </button>
        </div>
      )}

      <Keyboard onKey={handleKey} letterStatus={letterStatus} />
    </div>
  );
}
