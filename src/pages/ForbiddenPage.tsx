import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="text-sm font-semibold text-neutral-500">Tenant: {tenant ?? "-"}</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Access denied</h1>
      </header>
      <main className="p-6">
        <section className="card max-w-2xl p-5">
          <h2 className="text-lg font-semibold text-neutral-900">Admin permission required</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Your account is signed in, but it does not have permission to open this administration area.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn btn-primary mt-4"
          >
            Back to Home
          </button>
        </section>
      </main>
    </div>
  );
}
