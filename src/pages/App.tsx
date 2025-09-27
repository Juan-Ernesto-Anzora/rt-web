import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "../auth/useAuth";
import api from "../lib/api";

type RequestSummary = {
  requestid?: string;
  humanid?: string;
  title: string;
  statusid?: string;
  assignee?: string | null;
  updated_at?: string;
  priority?: string;
};

type RequestsResponse = {
  results?: RequestSummary[];
};

const NAV_ITEMS = [
  "New Request",
  "My Tasks",
  "Other Tasks",
  "My Requests",
  "Search",
  "Settings",
];

function UserMenu({ onLogout }: { onLogout(): void }) {
  const menuItems = [
    "Profile & Preferences",
    "Keyboard Shortcuts",
    "Saved Views",
    "Notifications",
    "Switch Company/Tenant",
  ];

  return (
    <div className="absolute right-6 top-16 w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
      {menuItems.map((label) => (
        <button
          key={label}
          type="button"
          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-500 hover:bg-neutral-100"
      >
        Log out
      </button>
    </div>
  );
}

function TopBar({ tenant, onNew, onLogout }: { tenant?: string | null; onNew(): void; onLogout(): void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div className="text-lg font-semibold text-neutral-800">Request Tracker</div>
      <div className="relative flex items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          New Request
        </button>
        <div className="rounded-2xl border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
          Tenant: {tenant ?? "—"}
        </div>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <div className="h-8 w-8 rounded-full bg-primary-600" />
          <span className="text-sm font-medium text-neutral-800">Ana Gomez</span>
        </button>
        {open && <UserMenu onLogout={onLogout} />}
      </div>
    </header>
  );
}

function SideNav() {
  return (
    <aside className="w-60 border-r border-neutral-200 bg-neutral-50 p-3">
      {NAV_ITEMS.map((label) => (
        <div
          key={label}
          className={`px-4 py-2 text-neutral-700 ${label === "My Tasks" ? "rounded-lg bg-primary-600 font-semibold text-white" : "rounded-lg hover:bg-neutral-100"}`}
        >
          {label}
        </div>
      ))}
    </aside>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

const FALLBACK_REQUESTS: RequestSummary[] = [
  {
    humanid: "RT-2025-001001",
    title: "VPN not connecting",
    statusid: "Open",
    assignee: "Ana Gomez",
    updated_at: "2025-08-22T10:41:00Z",
    priority: "High",
  },
  {
    humanid: "RT-2025-001002",
    title: "Email quota exceeded",
    statusid: "In Progress",
    assignee: "Luis Perez",
    updated_at: "2025-08-22T09:18:00Z",
    priority: "Normal",
  },
  {
    humanid: "RT-2025-001003",
    title: "Printer F3 queue stuck",
    statusid: "Waiting",
    assignee: null,
    updated_at: "2025-08-21T17:02:00Z",
    priority: "Low",
  },
  {
    humanid: "RT-2025-001004",
    title: "VPN split tunneling",
    statusid: "Closed",
    assignee: "Ana Gomez",
    updated_at: "2025-08-20T15:27:00Z",
    priority: "Normal",
  },
];

export default function App() {
  const { tenant, logout } = useAuth();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      if (!tenant) return;
      setLoading(true);
      try {
        const response = await api.get<RequestsResponse>("/requests/");
        if (cancelled) return;
        setRequests(response.data.results ?? []);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        const detail = axiosError.response?.data?.detail;
        setError(detail ?? "Failed to load requests");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const rows = useMemo(() => {
    const source = requests.length > 0 ? requests : FALLBACK_REQUESTS;
    return source.map((request) => ({
      id: request.humanid ?? request.requestid ?? "—",
      title: request.title,
      status: request.statusid ?? "—",
      assignee: request.assignee ?? "—",
      updated:
        request.updated_at && !Number.isNaN(Date.parse(request.updated_at))
          ? new Date(request.updated_at).toLocaleString(undefined, {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      priority: request.priority ?? "—",
    }));
  }, [requests]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar tenant={tenant} onNew={() => alert("New Request")} onLogout={logout} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 space-y-4 p-6">
          <div className="grid grid-cols-4 gap-4">
            <KPI label="Open" value="24" />
            <KPI label="In Progress" value="12" />
            <KPI label="Due Today" value="5" />
            <KPI label="Overdue" value="3" />
          </div>

          <div className="flex gap-3">
            <input
              placeholder="Search tickets…"
              className="card h-11 w-[520px] px-3 outline-none"
              aria-label="Search tickets"
            />
            <button type="button" className="card h-11 px-4 text-sm font-semibold">
              Saved Views
            </button>
            <button type="button" className="btn btn-primary">
              New Request
            </button>
          </div>

          <div className="card p-4">
            <div className="grid grid-cols-6 text-sm font-semibold text-neutral-600">
              <div>ID</div>
              <div>Title</div>
              <div>Status</div>
              <div>Assignee</div>
              <div>Updated</div>
              <div>Priority</div>
            </div>

            {loading && <div className="py-6 text-sm text-neutral-500">Loading requests…</div>}
            {error && !loading && (
              <div className="py-6 text-sm text-danger-500">{error}</div>
            )}

            {!loading && !error && (
              <div className="divide-y divide-neutral-200">
                {rows.map((row) => (
                  <div key={`${row.id}-${row.title}`} className="grid grid-cols-6 py-3 text-sm">
                    <div>{row.id}</div>
                    <div>{row.title}</div>
                    <div>{row.status}</div>
                    <div>{row.assignee}</div>
                    <div>{row.updated}</div>
                    <div>{row.priority}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
