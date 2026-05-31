import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DashboardListKey,
  DashboardRequest,
  DashboardSummary,
  getDashboardRequests,
  getDashboardSummary,
} from "../api/dashboard";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingRows } from "../components/common/LoadingRows";
import { KpiCard } from "../components/dashboard/KpiCard";
import { RequestTable } from "../components/requests/RequestTable";

type QuickFilter = "my_open" | "high_priority" | "recently_updated" | "closed" | "unassigned";

const TABS: Array<{ key: DashboardListKey; label: string; emptyTitle: string; emptyBody: string }> = [
  {
    key: "my_tasks",
    label: "My Tasks",
    emptyTitle: "No tasks assigned to you.",
    emptyBody: "When new requests are assigned, they will appear here.",
  },
  {
    key: "other_tasks",
    label: "Other Tasks",
    emptyTitle: "No other tasks found.",
    emptyBody: "Requests assigned to other people or unassigned queues will appear here.",
  },
  {
    key: "my_requests",
    label: "My Requests",
    emptyTitle: "No requests created by you.",
    emptyBody: "Requests you submit will appear here for quick follow-up.",
  },
  {
    key: "recently_updated",
    label: "Recently Updated",
    emptyTitle: "No recent updates.",
    emptyBody: "Recently changed requests will appear here.",
  },
];

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: "my_open", label: "My Open" },
  { key: "high_priority", label: "High Priority" },
  { key: "recently_updated", label: "Recently Updated" },
  { key: "closed", label: "Closed" },
  { key: "unassigned", label: "Unassigned" },
];

const FALLBACK_SUMMARY: DashboardSummary = {
  open: 4,
  inProgress: 2,
  dueToday: 0,
  overdue: 0,
};

const FALLBACK_REQUESTS: DashboardRequest[] = [
  {
    id: "RT-2025-001001",
    requestId: "RT-2025-001001",
    title: "VPN not connecting",
    status: "Open",
    priority: "High",
    assignee: "Ana Gomez",
    requester: "Carlos Diaz",
    updatedAt: "2025-08-22T10:41:00Z",
  },
  {
    id: "RT-2025-001002",
    requestId: "RT-2025-001002",
    title: "Email quota exceeded",
    status: "In Progress",
    priority: "Normal",
    assignee: "Luis Perez",
    requester: "Maria Lopez",
    updatedAt: "2025-08-22T09:18:00Z",
  },
  {
    id: "RT-2025-001003",
    requestId: "RT-2025-001003",
    title: "Printer F3 queue stuck",
    status: "Waiting",
    priority: "Low",
    assignee: "-",
    requester: "Nadia Flores",
    updatedAt: "2025-08-21T17:02:00Z",
  },
  {
    id: "RT-2025-001004",
    requestId: "RT-2025-001004",
    title: "VPN split tunneling",
    status: "Closed",
    priority: "Normal",
    assignee: "Ana Gomez",
    requester: "Rafael Cruz",
    updatedAt: "2025-08-20T15:27:00Z",
  },
];

function filterFallbackRequests(tab: DashboardListKey, quickFilter: QuickFilter | "") {
  let requests = [...FALLBACK_REQUESTS];
  if (tab === "my_tasks") requests = requests.filter((request) => request.assignee === "Ana Gomez");
  if (tab === "other_tasks") requests = requests.filter((request) => request.assignee !== "Ana Gomez");
  if (tab === "my_requests") requests = requests.filter((request) => request.requester === "Carlos Diaz");

  if (quickFilter === "my_open") {
    requests = requests.filter((request) => request.assignee === "Ana Gomez" && request.status !== "Closed");
  }
  if (quickFilter === "high_priority") {
    requests = requests.filter((request) => request.priority.toLowerCase() === "high");
  }
  if (quickFilter === "closed") {
    requests = requests.filter((request) => request.status === "Closed");
  }
  if (quickFilter === "unassigned") {
    requests = requests.filter((request) => request.assignee === "-");
  }

  return requests;
}

export function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>(FALLBACK_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardListKey>("my_tasks");
  const [quickFilter, setQuickFilter] = useState<QuickFilter | "">("");
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const nextSummary = await getDashboardSummary();
      setSummary(nextSummary);
      setSummaryError(null);
    } catch {
      setSummary(FALLBACK_SUMMARY);
      setSummaryError("KPI filters are unavailable; showing demo fallback values.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setListLoading(true);
    try {
      const response = await getDashboardRequests({
        list: activeTab,
        quickFilter,
        page: 1,
        pageSize: 10,
        sort: "-updated_at",
      });
      setRequests(response.results);
      setRequestCount(response.count);
      setListError(null);
    } catch {
      const fallbackRequests = filterFallbackRequests(activeTab, quickFilter);
      setRequests(fallbackRequests);
      setRequestCount(fallbackRequests.length);
      setListError("Could not load dashboard from API. Showing local demo data.");
    } finally {
      setListLoading(false);
    }
  }, [activeTab, quickFilter]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  function refreshDashboard() {
    loadSummary();
    loadRequests();
  }

  const activeTabDetails = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Home</h1>
          <p className="mt-1 text-sm text-neutral-600">Track the request queues that need attention today.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/requests/new")}
            className="btn btn-primary"
          >
            New Request
          </button>
          <button
            type="button"
            onClick={refreshDashboard}
            className="rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {summaryError && <ErrorState message={summaryError} onRetry={loadSummary} />}

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Open" value={summary.open} loading={summaryLoading} />
        <KpiCard label="In Progress" value={summary.inProgress} loading={summaryLoading} />
        <KpiCard label="Due Today" value={summary.dueToday} loading={summaryLoading} />
        <KpiCard label="Overdue" value={summary.overdue} loading={summaryLoading} />
      </div>

      <form onSubmit={submitSearch} className="card flex gap-3 p-3">
        <label className="sr-only" htmlFor="home-search">
          Search requests
        </label>
        <input
          id="home-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
          placeholder="Search tickets..."
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-neutral-300 bg-neutral-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
                  activeTab === tab.key ? "bg-primary-600 text-white" : "text-neutral-700 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-sm font-semibold text-neutral-600">{requestCount} requests</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setQuickFilter((current) => (current === filter.key ? "" : filter.key))}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
                quickFilter === filter.key
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {listError && <ErrorState message={listError} onRetry={loadRequests} />}
      {listLoading && <LoadingRows />}
      {!listLoading && requests.length === 0 && (
        <EmptyState title={activeTabDetails.emptyTitle} body={activeTabDetails.emptyBody} />
      )}
      {!listLoading && requests.length > 0 && (
        <RequestTable
          requests={requests}
          onOpenRequest={(requestId) => navigate(`/requests/${encodeURIComponent(requestId)}`)}
        />
      )}
    </section>
  );
}
