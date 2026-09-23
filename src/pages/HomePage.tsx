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

export function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
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
      setSummary(null);
      setSummaryError("Could not load dashboard summary from API.");
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
      setRequests([]);
      setRequestCount(0);
      setListError("Could not load dashboard requests from API.");
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
    <section className="legacy-page space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Home</h1>
          <p className="mt-1 text-sm text-neutral-600">Track the request queues that need attention today.</p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label="Open" value={summary?.open ?? null} loading={summaryLoading} />
        <KpiCard label="In Progress" value={summary?.inProgress ?? null} loading={summaryLoading} />
        <KpiCard label="Due Today" value={summary?.dueToday ?? null} loading={summaryLoading} />
        <KpiCard label="Overdue" value={summary?.overdue ?? null} loading={summaryLoading} />
      </div>

      <form onSubmit={submitSearch} className="card flex flex-col gap-3 p-3 sm:flex-row">
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
        <button
          type="button"
          onClick={() => setSearch("")}
          className="rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Clear
        </button>
      </form>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-full overflow-x-auto rounded-lg border border-neutral-300 bg-neutral-50 p-1">
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
