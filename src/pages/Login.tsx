import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

type Props = {
  onLoggedIn(tokens: { access: string; refresh?: string }, tenant: string): void;
};

export default function Login({ onLoggedIn }: Props) {
  const [tenant, setTenant] = useState(import.meta.env.VITE_TENANT_CODE ?? "");
  const [username, setUsername] = useState(""); // o email si usas email como username
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post(
        "/auth/jwt/create", // importante: sin slash final
        { username, password },
        { headers: { "X-Tenant": tenant } } // el login también exige el header
      );
      onLoggedIn(res.data, tenant);
      navigate("/"); // Redirect to Home after successful login
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Limpieza simple de estado, por si vienes redirigido de 401
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>

        <label className="block text-sm mb-1">Tenant code</label>
        <input
          className="w-full border rounded p-2 mb-3"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          placeholder="ACME"
          required
        />

        <label className="block text-sm mb-1">Username</label>
        <input
          className="w-full border rounded p-2 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full border rounded p-2 mb-3"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2 font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}