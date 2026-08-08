import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase.js";
import { apiFetch } from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    apiFetch("/api/me", { user }).then(setMe).catch((err) => setError(err.message));
  }, [user]);

  async function handleSubmit(e, mode) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form className="flex flex-col gap-2 w-64">
          <input
            className="border p-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="bg-blue-600 text-white p-2" onClick={(e) => handleSubmit(e, "signin")}>
            Sign in
          </button>
          <button className="border p-2" onClick={(e) => handleSubmit(e, "signup")}>
            Create account
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col gap-2">
        <p>Signed in as {user.email}</p>
        <pre className="text-xs bg-gray-100 p-2">{JSON.stringify(me, null, 2)}</pre>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="border p-2" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    </div>
  );
}
