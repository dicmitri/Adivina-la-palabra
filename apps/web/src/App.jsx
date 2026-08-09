import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { auth } from "./firebase.js";
import { apiFetch } from "./api.js";
import GameBoard from "./components/GameBoard.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Admin from "./components/Admin.jsx";

// Firebase throws English strings like "Firebase: Error
// (auth/invalid-credential)." — never show those to a player.
const AUTH_ERRORS = {
  "auth/invalid-email": "Ese email no es válido.",
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/user-not-found": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  "auth/network-request-failed": "Sin conexión. Comprueba tu internet.",
};

const authErrorMessage = (err) =>
  AUTH_ERRORS[err?.code] || "No se pudo completar la operación. Inténtalo de nuevo.";

function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return null;
  if (user) return children(user);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white p-8 rounded-xl shadow-lg border">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">Adivina la Palabra</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border p-2 rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full border p-2 rounded"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button className="w-full bg-blue-600 text-white py-2 rounded font-bold">
            {isRegister ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center text-sm text-gray-500 mt-4 underline">
          {isRegister ? "¿Ya tienes cuenta?" : "¿Nuevo? Crea una cuenta"}
        </button>
      </div>
    </div>
  );
}

function ChooseUsername({ user, onCreated }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const profile = await apiFetch("/api/me", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      onCreated(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white p-8 rounded-xl shadow-lg border">
        <h1 className="text-xl font-bold text-center mb-6">Elige un nombre de usuario</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border p-2 rounded"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button disabled={submitting} className="w-full bg-blue-600 text-white py-2 rounded font-bold disabled:opacity-50">
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await updatePassword(auth.currentUser, newPw);
      setMsg("¡Contraseña actualizada!");
      setNewPw("");
    } catch (err) {
      // Firebase refuses to change a password on a stale session; say so
      // plainly rather than showing the raw error code.
      if (err.code === "auth/requires-recent-login") {
        setMsg("Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo.");
      } else if (err.code === "auth/weak-password") {
        setMsg("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setMsg("No se pudo actualizar. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="text-xs font-bold text-gray-600">Nueva contraseña</label>
      <input
        type="password"
        className="w-full border p-2 rounded text-sm"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
        minLength={6}
        required
      />
      {msg && <p className="text-xs text-blue-600">{msg}</p>}
      <button className="w-full bg-blue-600 text-white text-sm py-1.5 rounded font-bold">Guardar</button>
    </form>
  );
}

function MainApp({ user, profile, isAdmin }) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newFreq, setNewFreq] = useState("daily");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [showChangePw, setShowChangePw] = useState(false);

  async function refreshLeagues() {
    const { leagues: list } = await apiFetch("/api/leagues/mine", { user });
    setLeagues(list);
    if (list.length > 0 && !selectedLeague) setSelectedLeague(list[0]);
    return list;
  }

  useEffect(() => {
    refreshLeagues();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/leagues", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName, frequency: newFreq }),
      });
      setNewLeagueName("");
      setShowCreate(false);
      await refreshLeagues();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/leagues/join", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      setJoinCode("");
      await refreshLeagues();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteLeague() {
    if (!selectedLeague) return;
    if (!window.confirm(`¿Eliminar la liga "${selectedLeague.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/api/leagues/${selectedLeague.id}`, { method: "DELETE", user });
      setSelectedLeague(null);
      await refreshLeagues();
    } catch (err) {
      setError(err.message);
    }
  }

  if (showAdmin) return <Admin user={user} onClose={() => setShowAdmin(false)} />;

  return (
    <div className="min-h-screen text-gray-900 font-sans bg-gray-50">
      <header className="sticky top-0 z-50 px-4 h-16 flex items-center justify-between bg-white/80 backdrop-blur border-b shadow-sm">
        <span className="font-bold text-lg text-gray-800">Adivina la Palabra</span>
        <div className="flex items-center gap-4 relative">
          <span className="font-medium text-sm text-gray-700">{profile.username}</span>
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setShowChangePw((v) => !v)}
            className="text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-md hover:bg-gray-100"
          >
            Contraseña
          </button>
          <button onClick={() => signOut(auth)} className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100">
            Salir
          </button>
          {showChangePw && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white p-4 rounded-xl shadow-lg border z-50">
              <ChangePassword />
              <div className="mt-3 pt-3 border-t">
                <p className="text-[10px] text-gray-400 mb-1">Tu ID de usuario</p>
                <p className="font-mono text-[10px] break-all select-all bg-gray-50 p-1 rounded border">
                  {user.uid}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:grid md:grid-cols-4 gap-6">
          <section className="order-2 md:order-1 md:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h2 className="font-bold text-gray-700 mb-4">Mis Ligas</h2>
              {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
              <div className="space-y-2">
                {leagues.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeague(l)}
                    className={`w-full text-left p-3 rounded text-sm font-medium flex justify-between ${selectedLeague?.id === l.id ? "bg-blue-50 text-blue-700 border border-blue-200" : "hover:bg-gray-50"}`}
                  >
                    <span>{l.name}</span>
                    <span className="text-xs bg-gray-200 px-1 rounded">
                      {l.frequency === "daily" ? "Diaria" : l.frequency === "weekly" ? "Semanal" : "Trimestral"}
                    </span>
                  </button>
                ))}
                {leagues.length === 0 && <p className="text-sm text-gray-400 italic">No estás en ninguna liga.</p>}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <button onClick={() => setShowCreate(!showCreate)} className="w-full py-2 bg-gray-800 text-white rounded text-sm font-bold">
                  + Crear Liga
                </button>
                {showCreate && (
                  <form onSubmit={handleCreate} className="bg-gray-50 p-2 rounded border mt-2 space-y-2">
                    <input
                      className="w-full text-sm p-1 border rounded"
                      placeholder="Nombre Liga"
                      value={newLeagueName}
                      onChange={(e) => setNewLeagueName(e.target.value)}
                      required
                    />
                    <select className="w-full text-sm p-1 border rounded" value={newFreq} onChange={(e) => setNewFreq(e.target.value)}>
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="quarterly">Trimestral</option>
                    </select>
                    <button className="w-full bg-blue-600 text-white text-xs py-1 rounded">Guardar</button>
                  </form>
                )}
                <form onSubmit={handleJoin} className="flex gap-1 mt-2">
                  <input
                    className="w-full text-xs p-1 border rounded"
                    placeholder="Código de invitación"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <button className="bg-green-600 text-white text-xs px-2 rounded">Unirse</button>
                </form>
              </div>

              {selectedLeague && (
                <div className="mt-4 p-2 bg-yellow-50 text-xs text-yellow-800 rounded border border-yellow-100">
                  <p className="font-bold">Código de Invitación:</p>
                  <p className="font-mono select-all bg-white p-1 rounded border mt-1">{selectedLeague.inviteCode}</p>
                  {selectedLeague.adminId === user.uid && (
                    <button onClick={handleDeleteLeague} className="mt-3 w-full py-2 bg-red-100 text-red-700 font-bold rounded border border-red-200 hover:bg-red-200">
                      Eliminar Liga
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="order-1 md:order-2 md:col-span-2 flex justify-center">
            {selectedLeague ? (
              <GameBoard league={selectedLeague} user={user} onScoreChange={() => setLeaderboardRefresh((n) => n + 1)} />
            ) : (
              <div className="p-10 text-gray-400 text-center w-full bg-white rounded border border-dashed">Selecciona o crea una liga para jugar.</div>
            )}
          </section>

          <section className="order-3 md:order-3 md:col-span-1">
            <div className="sticky top-20 h-[calc(100vh-100px)]">
              {selectedLeague && <Leaderboard league={selectedLeague} user={user} refreshKey={leaderboardRefresh} />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AuthedApp({ user }) {
  const [profile, setProfile] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiFetch("/api/me", { user }).then((data) => {
      setProfile(data.profile);
      setIsAdmin(Boolean(data.isAdmin));
    });
  }, [user]);

  if (profile === undefined) return null;
  if (!profile) return <ChooseUsername user={user} onCreated={setProfile} />;
  return <MainApp user={user} profile={profile} isAdmin={isAdmin} />;
}

export default function App() {
  return <AuthGate>{(user) => <AuthedApp user={user} />}</AuthGate>;
}
