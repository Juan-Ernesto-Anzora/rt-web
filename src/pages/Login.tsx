import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import api from "../lib/api";

type LoginResponse = {
  access: string;
  refresh?: string;
};

export default function Login() {
  const { login, tenant: currentTenant } = useAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(() => currentTenant ?? import.meta.env.VITE_TENANT_CODE ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await api.post<LoginResponse>(
        "/auth/jwt/create",
        { username, password },
        { headers: { "X-Tenant": tenant } },
      );
      login(response.data, tenant);
      navigate("/", { replace: true });
    } catch (requestError) {
      const axiosError = requestError as AxiosError<{ detail?: string }>;
      const detail = axiosError.response?.data?.detail;
      setError(detail ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>

        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tenant">
          Tenant code
        </label>
        <input
          id="tenant"
          className="mb-3 w-full rounded border border-neutral-300 p-2"
          value={tenant}
          onChange={(event) => setTenant(event.target.value)}
          placeholder="ACME"
          required
          autoComplete="organization"
          disabled={busy}
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="mb-3 w-full rounded border border-neutral-300 p-2"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          required
          autoComplete="username"
          disabled={busy}
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="mb-3 w-full rounded border border-neutral-300 p-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          disabled={busy}
        />

        {error && <div className="mb-3 text-sm text-danger-500">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
