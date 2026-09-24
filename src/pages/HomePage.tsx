import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  type DashboardListKey, type DashboardRequest, type DashboardSummary,
  getDashboardRequests, getDashboardSummary,
} from "../api/dashboard";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { InlineNotice } from "../components/common/InlineNotice";
import { LoadingRows } from "../components/common/LoadingRows";
import { PaginationControls } from "../components/common/PaginationControls";
import { KpiCard } from "../components/dashboard/KpiCard";
import { RequestTable } from "../components/requests/RequestTable";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Controls";
import { PageHeader } from "../components/ui/PageHeader";

type QuickFilter = "my_open" | "high_priority" | "closed" | "unassigned";
type Sort = "-updated_at" | "updated_at";
type DashboardQuery = { queue: DashboardListKey; quick: QuickFilter | ""; page: number; sort: Sort };
type ListState = { scope: string; rows: DashboardRequest[]; count: number; loading: boolean; error: string | null };

const TABS: Array<{ key: DashboardListKey; label: string; emptyTitle: string; emptyBody: string }> = [
  { key: "my_tasks", label: "My Tasks", emptyTitle: "No tasks assigned to you.", emptyBody: "When new requests are assigned, they will appear here." },
  { key: "other_tasks", label: "Other Tasks", emptyTitle: "No other tasks found.", emptyBody: "Requests assigned to other people or unassigned queues will appear here." },
  { key: "my_requests", label: "My Requests", emptyTitle: "No requests created by you.", emptyBody: "Requests you submit will appear here for quick follow-up." },
  { key: "recently_updated", label: "Recently Updated", emptyTitle: "No recent updates.", emptyBody: "Recently changed requests will appear here." },
];
const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: "my_open", label: "My Open" },
  { key: "high_priority", label: "High Priority" },
  { key: "closed", label: "Closed" },
  { key: "unassigned", label: "Unassigned" },
];

function readQuery(params: URLSearchParams): DashboardQuery {
  const selectedQueue = params.get("queue");
  const selectedQuick = params.get("quick");
  const queue = TABS.find(tab => tab.key === selectedQueue)?.key ?? "my_tasks";
  const quick = QUICK_FILTERS.find(filter => filter.key === selectedQuick)?.key ?? "";
  const rawPage = params.get("page") ?? "";
  const parsedPage = Number(rawPage);
  const page = /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(parsedPage) ? parsedPage : 1;
  return {
    queue: quick === "my_open" ? "my_tasks" : queue,
    quick,
    page: quick === "my_open" && queue !== "my_tasks" ? 1 : page,
    sort: params.get("sort") === "updated_at" ? "updated_at" : "-updated_at",
  };
}

function toParams(previous: URLSearchParams, query: DashboardQuery) {
  const next = new URLSearchParams(previous);
  for (const key of ["queue", "quick", "page", "sort"]) next.delete(key);
  if (query.queue !== "my_tasks") next.set("queue", query.queue);
  if (query.quick) next.set("quick", query.quick);
  if (query.page > 1) next.set("page", String(query.page));
  if (query.sort !== "-updated_at") next.set("sort", query.sort);
  return next;
}

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return fallback;
  return typeof data.message === "string" ? data.message : typeof data.detail === "string" ? data.detail : fallback;
}

export function HomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { queue, quick, page, sort } = readQuery(params);
  const scope = [queue, quick, page, sort].join("|");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [list, setList] = useState<ListState>({ scope: "", rows: [], count: 0, loading: true, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [listRetry, setListRetry] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const canonical = toParams(params, { queue, quick, page, sort });
    if (canonical.toString() !== params.toString()) setParams(canonical, { replace: true });
  }, [params, setParams, queue, quick, page, sort]);

  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError(null);
    getDashboardSummary().then(value => {
      if (active) setSummary(value);
    }).catch(error => {
      if (active) { setSummary(null); setSummaryError(errorMessage(error, "Could not load dashboard summary.")); }
    }).finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [refreshKey, summaryRetry]);

  useEffect(() => {
    let active = true;
    setList(current => current.scope === scope
      ? { ...current, loading: true, error: null }
      : { scope, rows: [], count: 0, loading: true, error: null });
    getDashboardRequests({ list: queue, quickFilter: quick, page, pageSize: 10, sort }).then(result => {
      if (active) setList({ scope, rows: result.results, count: result.count, loading: false, error: null });
    }).catch(error => {
      if (active) setList({ scope, rows: [], count: 0, loading: false, error: errorMessage(error, "Could not load dashboard requests.") });
    });
    return () => { active = false; };
  }, [scope, queue, quick, page, sort, refreshKey, listRetry]);

  const current = list.scope === scope;
  const rows = current ? list.rows : [];
  const count = current ? list.count : 0;
  const listLoading = !current || list.loading;
  const listError = current ? list.error : null;
  const activeTab = TABS.find(tab => tab.key === queue) ?? TABS[0];

  function updateQuery(next: DashboardQuery) {
    setParams(toParams(params, next));
  }
  function selectQueue(nextQueue: DashboardListKey) {
    updateQuery({ queue: nextQueue, quick: quick === "my_open" && nextQueue !== "my_tasks" ? "" : quick, page: 1, sort });
  }
  function toggleQuick(nextQuick: QuickFilter) {
    const selected = quick === nextQuick ? "" : nextQuick;
    updateQuery({ queue: selected === "my_open" ? "my_tasks" : queue, quick: selected, page: 1, sort });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? "/search?q=" + encodeURIComponent(query) : "/search");
  }

  return <section className="min-h-[calc(100vh-3.5rem)] space-y-5 bg-background p-4 text-foreground sm:p-6">
    <PageHeader title="Home" description="Track the request queues that need attention today."
      actions={<Button variant="secondary" size="sm" onClick={() => setRefreshKey(value => value + 1)}>Refresh</Button>} />
    <section aria-label="Attention summary" className="space-y-2">
      {summaryError ? <ErrorState message={summaryError} onRetry={() => setSummaryRetry(value => value + 1)} /> : null}
      {summaryLoading && !summary ? <span role="status" className="sr-only">Loading dashboard summary</span> : null}
      {summaryLoading && summary ? <span role="status" className="text-xs text-text-muted">Refreshing summary...</span> : null}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-small border border-border bg-border lg:grid-cols-4">
        <KpiCard label="Open" value={summary?.open ?? null} loading={summaryLoading && !summary} />
        <KpiCard label="In Progress" value={summary?.inProgress ?? null} loading={summaryLoading && !summary} />
        <KpiCard label="Due Today" value={summary?.dueToday ?? null} loading={summaryLoading && !summary} />
        <KpiCard label="Overdue" value={summary?.overdue ?? null} loading={summaryLoading && !summary} />
      </div>
    </section>

    <section aria-labelledby="work-queue-title" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="work-queue-title" className="text-lg font-semibold">Work queue</h2>
          <p aria-live="polite" className="text-sm text-text-muted">{listLoading && !rows.length ? "Loading requests..." : listError ? "Requests unavailable" : count + " requests"}</p>
        </div>
        <label htmlFor="dashboard-sort" className="flex items-center gap-2 text-sm text-text-muted">
          Sort
          <Select id="dashboard-sort" value={sort} onChange={event => updateQuery({ queue, quick, page: 1, sort: event.target.value as Sort })} className="!w-auto min-w-36">
            <option value="-updated_at">Most recently updated</option><option value="updated_at">Oldest updated</option>
          </Select>
        </label>
      </header>
      <div role="group" aria-label="Request queues" className="flex max-w-full gap-1 overflow-x-auto border-b border-border/60">
        {TABS.map(tab => <Button key={tab.key} variant="ghost" size="sm" aria-pressed={queue === tab.key}
          onClick={() => selectQueue(tab.key)} className={"!rounded-none !border-b-2 whitespace-nowrap " + (queue === tab.key ? "!border-border-strong !bg-surface-active" : "!text-text-muted")}>{tab.label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Quick filters" className="flex flex-wrap gap-1">
          {QUICK_FILTERS.map(filter => <Button key={filter.key} variant="ghost" size="sm"
            aria-pressed={quick === filter.key} onClick={() => toggleQuick(filter.key)}
            className={quick === filter.key ? "!bg-surface-active !font-bold" : "!text-text-muted"}>{filter.label}</Button>)}
        </div>
        {quick ? <Button variant="ghost" size="sm" onClick={() => updateQuery({ queue, quick: "", page: 1, sort })}>Clear filters</Button> : null}
      </div>
      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="home-search" className="sr-only">Search all requests</label>
        <Input id="home-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search all requests" className="min-w-0 flex-1" />
        <Button type="submit" variant="secondary">Search all</Button>
        {search ? <Button variant="ghost" onClick={() => setSearch("")}>Clear</Button> : null}
      </form>

      {listError ? <ErrorState message={listError} onRetry={() => setListRetry(value => value + 1)} /> : null}
      {listLoading && !rows.length && !listError ? <LoadingRows rows={5} /> : null}
      {listLoading && rows.length > 0 ? <InlineNotice message="Refreshing requests..." /> : null}
      {!listLoading && !listError && rows.length === 0
        ? <EmptyState title={quick ? "No requests match this view." : activeTab.emptyTitle} body={quick ? "Try clearing the current filter." : activeTab.emptyBody}
            action={quick ? <Button variant="secondary" size="sm" onClick={() => updateQuery({ queue, quick: "", page: 1, sort })}>Clear filters</Button> : undefined} />
        : null}
      {!listError && rows.length > 0 ? <div aria-busy={listLoading}>
        <RequestTable requests={rows} />
      </div> : null}
      {!listError && !listLoading && (count > 10 || page > 1)
        ? <PaginationControls page={page} pageSize={10} count={count} label="requests" onPageChange={next => updateQuery({ queue, quick, page: next, sort })} />
        : null}
    </section>
  </section>;
}
