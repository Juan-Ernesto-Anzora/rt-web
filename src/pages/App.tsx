import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuthController } from "../auth/useAuth";

function UserMenu() {
  return (
    <div className="absolute right-6 top-16 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 p-2">
      {['Profile & Preferences','Keyboard Shortcuts','Saved Views','Notifications','Switch Company/Tenant','Log out'].map((label) => (
        <div key={label} className="px-3 py-2 rounded-lg hover:bg-neutral-100 cursor-pointer font-medium text-sm">
          {label}
        </div>
      ))}
    </div>
  )
}

function TopBar({onNew}:{onNew:()=>void}) {
  const [open, setOpen] = useState(false)
  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      <div className="font-semibold text-lg text-neutral-800">Request Tracker</div>
      <div className="flex items-center gap-3 relative">
        <button className="btn btn-primary" onClick={onNew}>New Request</button>
        <div className="px-3 py-1 rounded-2xl bg-neutral-100 border border-neutral-300 text-sm font-semibold">Tenant: ACME</div>
        <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
          <div className="w-8 h-8 rounded-full bg-primary-600" />
          <span className="text-sm font-medium text-neutral-800">Ana Gomez</span>
        </div>
        {open && <UserMenu />}
      </div>
    </header>
  )
}

function SideNav() {
  const items = ['New Request','My Tasks','Other Tasks','My Requests','Search','Settings','Logout']
  return (
    <aside className="w-60 bg-neutral-50 border-r border-neutral-200 p-3">
      {items.map((label) => (
        <div
          key={label}
          className={`px-4 py-2 rounded-lg ${label==='My Tasks' ? 'bg-primary-600 text-white font-semibold' : 'hover:bg-neutral-100 text-neutral-700'}`}
        >
          {label}
        </div>
      ))}
    </aside>
  )
}

function KPI({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className={`card p-4 ${cls || ''}`}>
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 mt-1">{value}</div>
    </div>
  );
}

function App() {
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { token, tenant } = useAuthController();

  useEffect(() => {
    if (!token || !tenant) return; // Espera a que estén listos
    api.get("/requests/")
      .then((r) => setRequests(r.data.results ?? []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load"));
  }, [token, tenant]);

  // You may need to define onLogout or import it if used
  const onLogout = () => {
    // Implement logout logic here
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Home</h1>
        <button className="text-sm underline" onClick={onLogout}>Logout</button>
      </header>

      {error && <div className="text-red-600">{error}</div>}
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.requestid} className="p-3 rounded border">
            <div className="font-medium">{r.humanid} — {r.title}</div>
            <div className="text-sm text-neutral-600">{r.priority} · {r.statusid}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;