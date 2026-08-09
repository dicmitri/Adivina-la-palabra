import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

function WordSuggestions({ user }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  async function load() {
    try {
      const { suggestions } = await apiFetch("/api/admin/suggestions", { user });
      setRows(suggestions);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function decide(word, decision) {
    setBusy(word);
    setError("");
    try {
      await apiFetch(`/api/admin/suggestions/${encodeURIComponent(word)}`, {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setRows((prev) => prev.filter((r) => r.word !== word));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (!rows) return <p className="text-sm text-gray-400">Cargando…</p>;

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No hay palabras pendientes.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.word} className="flex items-center justify-between border rounded p-3">
              <div>
                <span className="font-mono font-bold">{r.word}</span>
                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {r.votes} {r.votes === 1 ? "voto" : "votos"}
                </span>
                <p className="text-xs text-gray-500 mt-1">Propuesta por: {r.suggestedBy}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy === r.word}
                  onClick={() => decide(r.word, "approve")}
                  className="text-xs font-bold px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  disabled={busy === r.word}
                  onClick={() => decide(r.word, "reject")}
                  className="text-xs font-bold px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AcceptedWords({ user }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    apiFetch("/api/admin/words", { user })
      .then(({ words }) => setRows(words))
      .catch((err) => setError(err.message));
  }, []);

  async function remove(word) {
    if (!window.confirm(`¿Quitar «${word}» del diccionario? Dejará de aceptarse al instante.`)) return;
    setBusy(word);
    setError("");
    try {
      await apiFetch(`/api/admin/words/${encodeURIComponent(word)}`, { method: "DELETE", user });
      setRows((prev) => prev.filter((r) => r.word !== word));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (!rows) return <p className="text-sm text-gray-400">Cargando…</p>;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Palabras añadidas a mano. Las del diccionario original no aparecen aquí y solo se pueden
        cambiar regenerando las listas.
      </p>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Todavía no has aceptado ninguna palabra.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.word} className="flex items-center justify-between border rounded p-3">
              <div>
                <span className="font-mono font-bold">{r.word}</span>
                <p className="text-xs text-gray-500 mt-1">
                  Aceptada por {r.approvedBy || "—"} · {r.approvedAt?.slice(0, 10)}
                </p>
              </div>
              <button
                disabled={busy === r.word}
                onClick={() => remove(r.word)}
                className="text-xs font-bold px-3 py-1.5 rounded border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueAdmin({ user }) {
  const [leagues, setLeagues] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { leagues: list } = await apiFetch("/api/admin/leagues", { user });
      setLeagues(list);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function open(league) {
    if (openId === league.id) return setOpenId(null);
    setOpenId(league.id);
    setMembers([]);
    try {
      const { members: m } = await apiFetch(`/api/admin/leagues/${league.id}/members`, { user });
      setMembers(m);
    } catch (err) {
      setError(err.message);
    }
  }

  async function makeAdmin(leagueId, adminId) {
    setError("");
    try {
      await apiFetch(`/api/admin/leagues/${leagueId}/admin`, {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      await load();
      setOpenId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!leagues) return <p className="text-sm text-gray-400">Cargando…</p>;

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <div className="space-y-2">
        {leagues.map((l) => (
          <div key={l.id} className="border rounded p-3">
            <button onClick={() => open(l)} className="w-full text-left">
              <span className="font-bold">{l.name}</span>
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{l.frequency}</span>
              <p className="text-xs text-gray-500 mt-1">
                Admin: {l.adminUsername} · {l.members} miembros · código{" "}
                <span className="font-mono">{l.inviteCode}</span>
              </p>
            </button>
            {openId === l.id && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-bold text-gray-600 mb-2">Cambiar administrador:</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <button
                      key={m.userId}
                      disabled={m.userId === l.adminId}
                      onClick={() => makeAdmin(l.id, m.userId)}
                      className="text-xs px-3 py-1.5 rounded border disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-50"
                    >
                      {m.username}
                      {m.userId === l.adminId ? " (actual)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin({ user, onClose }) {
  const [tab, setTab] = useState("words");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Administración</h1>
        <button onClick={onClose} className="text-sm underline text-gray-600">
          Volver al juego
        </button>
      </div>

      <div className="flex gap-4 border-b mb-4">
        {[
          ["words", "Palabras propuestas"],
          ["accepted", "Palabras aceptadas"],
          ["leagues", "Ligas"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-2 text-sm font-bold border-b-2 ${tab === id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "words" && <WordSuggestions user={user} />}
      {tab === "accepted" && <AcceptedWords user={user} />}
      {tab === "leagues" && <LeagueAdmin user={user} />}
    </div>
  );
}
