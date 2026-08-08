import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

function LetterTile({ char, status }) {
  const styles = {
    empty: "border-gray-300 bg-white text-black",
    typing: "border-gray-800 text-black",
    correct: "bg-green-500 border-green-500 text-white",
    present: "bg-yellow-500 border-yellow-500 text-white",
    absent: "bg-gray-500 border-gray-500 text-white",
  };
  return (
    <div
      className={`w-10 h-10 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-xl sm:text-2xl font-bold rounded ${styles[status] || styles.empty}`}
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

  useEffect(() => {
    apiFetch(`/api/leagues/${league.id}/today`, { user }).then(setState);
  }, [league.id, user]);

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
      if (result.status === "won") onScoreChange?.();
    } catch (err) {
      showMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(key) {
    if (!state || state.status !== "playing") return;
    if (key === "ENTER") submitGuess();
    else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < WORD_LENGTH) setCurrentGuess((p) => p + key);
  }

  if (!state) return <div className="p-10 text-center">Cargando...</div>;

  const guesses = state.guesses || [];
  const feedback = state.feedback || [];
  const letterStatus = buildLetterStatus(guesses, feedback);

  return (
    <div className="w-full max-w-md bg-white p-4 rounded-xl shadow border mx-auto">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold">{league.name}</h2>
        {msg && <div className="text-red-500 font-bold text-sm">{msg}</div>}
      </div>

      <div className="grid gap-2 mb-2">
        {[...Array(MAX_ATTEMPTS)].map((_, i) => (
          <div key={i} className="flex justify-center gap-2">
            {[...Array(WORD_LENGTH)].map((_, j) => {
              const guess = guesses[i];
              const isCurrent = i === guesses.length;
              const char = guess ? guess[j] : isCurrent ? currentGuess[j] : "";
              const st = guess ? feedback[i]?.[j] : isCurrent && char ? "typing" : "empty";
              return <LetterTile key={j} char={char} status={st} />;
            })}
          </div>
        ))}
      </div>

      {state.status !== "playing" && (
        <div
          className={`p-4 text-center rounded mb-4 ${state.status === "won" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          <h3 className="font-bold">{state.status === "won" ? "¡Bien hecho!" : "Ups, fallaste"}</h3>
          {state.word && <p>La palabra era: {state.word}</p>}
        </div>
      )}

      <Keyboard onKey={handleKey} letterStatus={letterStatus} />
    </div>
  );
}
