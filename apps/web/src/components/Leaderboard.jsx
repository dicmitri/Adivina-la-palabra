import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

const FREQUENCY_LABEL = { daily: "Diario", weekly: "Semana", quarterly: "Trimestre" };

export default function Leaderboard({ league, user, refreshKey }) {
  const [view, setView] = useState("daily");
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch(`/api/leagues/${league.id}/leaderboard?view=${view}`, { user }).then(setData);
  }, [league.id, user, view, refreshKey]);

  const scores = data?.scores || [];

  return (
    <div className="bg-white p-4 rounded-xl shadow border border-gray-100 h-full flex flex-col">
      <div className="border-b mb-2">
        <h3 className="font-bold text-lg text-gray-800 mb-2 px-1">Clasificación</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setView("daily")}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${view === "daily" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            📅 Hoy
          </button>
          <button
            onClick={() => setView("period")}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${view === "period" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            🏆 General
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-2 text-xs text-center text-gray-500 rounded mb-2">
        {view === "daily" ? `Resultados del día: ${data?.key ?? ""}` : `Total acumulado (${FREQUENCY_LABEL[league.frequency]}): ${data?.key ?? ""}`}
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[60vh] flex-1">
        {scores.length === 0 ? (
          <p className="text-gray-400 italic text-sm text-center py-8">
            {view === "daily" ? "Nadie ha jugado hoy." : "Nadie ha puntuado esta ronda."}
          </p>
        ) : (
          scores.map((s, i) => (
            <div key={s.userId} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded transition-colors border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i < 3 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                  {i + 1}
                </span>
                <div className="flex items-center">
                  <span
                    className={`font-semibold text-sm ${s.userId === data?.yesterdayWinner ? "text-yellow-600" : "text-gray-700"}`}
                    title={s.userId === data?.yesterdayWinner ? "Ganó ayer" : undefined}
                  >
                    {s.username}
                  </span>
                  {s.roundWins > 0 && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full" title={`Rondas ganadas: ${s.roundWins}`}>
                      🏆 {s.roundWins}
                    </span>
                  )}
                </div>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{s.score} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
