import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { HomePage } from "./HomePage";
import { useAuth } from "../auth/useAuth";
import {
  filterLocalSearchResults,
  RequestSearchFilters,
  RequestSearchResult,
  searchRequests,
  SearchFacetKey,
} from "../features/requestSearch";

type AppView = "home" | "search";

const NAV_ITEMS = [
  { id: "new", label: "New Request" },
  { id: "home", label: "My Tasks" },
  { id: "other", label: "Other Tasks" },
  { id: "requests", label: "My Requests" },
  { id: "search", label: "Search" },
  { id: "settings", label: "Settings" },
];

const EMPTY_SEARCH_FILTERS: RequestSearchFilters = {
  query: "",
  status: [],
  assignee: [],
  flow: [],
  tag: [],
  updatedFrom: "",
  updatedTo: "",
  page: 1,
  pageSize: 25,
  sort: "-updated_at",
};

const FALLBACK_SEARCH_RESULTS: RequestSearchResult[] = [
  {
    id: "RT-2025-001001",
    title: "VPN not connecting",
    status: "Open",
    assignee: "Ana Gomez",
    flow: "IT Support",
    tags: ["vpn", "remote-access"],
    updatedAt: "2025-08-22T10:41:00Z",
    snippet: "User cannot connect after password rotation. VPN client reports invalid profile.",
  },
  {
    id: "RT-2025-001002",
    title: "Email quota exceeded",
    status: "In Progress",
    assignee: "Luis Perez",
    flow: "Messaging",
    tags: ["email", "quota"],
    updatedAt: "2025-08-22T09:18:00Z",
    snippet: "Mailbox archive job requested before increasing quota.",
  },
  {
    id: "RT-2025-001003",
    title: "Printer F3 queue stuck",
    status: "Waiting",
    assignee: "-",
    flow: "Facilities",
    tags: ["printer", "floor-3"],
    updatedAt: "2025-08-21T17:02:00Z",
    snippet: "Queue is blocked by a failed PDF job. Waiting for onsite confirmation.",
  },
  {
    id: "RT-2025-001004",
    title: "VPN split tunneling",
    status: "Closed",
    assignee: "Ana Gomez",
    flow: "IT Support",
    tags: ["vpn", "policy"],
    updatedAt: "2025-08-20T15:27:00Z",
    snippet: "Policy updated and confirmed with the requester.",
  },
  {
    id: "RT-2025-001005",
    title: "New hire access package",
    status: "Open",
    assignee: "Marta Ruiz",
    flow: "Access Management",
    tags: ["onboarding", "access"],
    updatedAt: "2025-08-19T13:10:00Z",
    snippet: "Manager requested CRM, finance dashboard, and building access.",
  },
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
    <div className="absolute right-6 top-16 z-20 w-64 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
      {menuItems.map((label) => (
        <button
          key={label}
          type="button"
          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
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
        <div className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
          Tenant: {tenant ?? "-"}
        </div>
        <button
          type="button"
          className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
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

function SideNav({ activeView, onNavigate }: { activeView: AppView; onNavigate(view: AppView): void }) {
  return (
    <aside className="w-60 border-r border-neutral-200 bg-neutral-50 p-3">
      {NAV_ITEMS.map((item) => {
        const targetView: AppView | null = item.id === "search" ? "search" : item.id === "home" ? "home" : null;
        const isActive = targetView === activeView;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (targetView) onNavigate(targetView);
            }}
            className={`mb-1 w-full px-4 py-2 text-left text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
              isActive ? "rounded-lg bg-primary-600 font-semibold text-white" : "rounded-lg hover:bg-neutral-100"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}

function formatDate(value: string) {
  if (Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("waiting")) return "bg-warning-500/15 text-neutral-900";
  if (normalized.includes("closed")) return "bg-neutral-200 text-neutral-700";
  return "bg-primary-50 text-primary-700";
}

function uniqueFacetValues(results: RequestSearchResult[], key: SearchFacetKey) {
  const values = new Set<string>();
  results.forEach((result) => {
    if (key === "tag") {
      result.tags.forEach((tag) => values.add(tag));
      return;
    }
    values.add(result[key]);
  });
  return Array.from(values).filter(Boolean).sort();
}

function FacetGroup({
  title,
  facetKey,
  values,
  selected,
  onToggle,
}: {
  title: string;
  facetKey: SearchFacetKey;
  values: string[];
  selected: string[];
  onToggle(facetKey: SearchFacetKey, value: string): void;
}) {
  return (
    <fieldset className="border-t border-neutral-200 pt-4">
      <legend className="text-sm font-semibold text-neutral-800">{title}</legend>
      <div className="mt-2 space-y-2">
        {values.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(facetKey, value)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SearchResultsTable({ results }: { results: RequestSearchResult[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[130px_1fr_112px_132px_130px_116px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-600">
        <div>ID</div>
        <div>Request</div>
        <div>Status</div>
        <div>Assignee</div>
        <div>Flow</div>
        <div>Updated</div>
      </div>
      <div>
        {results.map((result) => (
          <div
            key={result.id}
            className="grid min-h-12 grid-cols-[130px_1fr_112px_132px_130px_116px] items-center border-b border-neutral-100 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-primary-50"
          >
            <div className="font-semibold text-neutral-800">{result.id}</div>
            <div className="min-w-0 pr-4">
              <div className="truncate font-semibold text-neutral-900">{result.title}</div>
              <div className="mt-1 truncate text-xs text-neutral-600">{result.snippet}</div>
              {result.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.tags.map((tag) => (
                    <span key={tag} className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(result.status)}`}>
                {result.status}
              </span>
            </div>
            <div className="truncate pr-4 text-neutral-700">{result.assignee}</div>
            <div className="truncate pr-4 text-neutral-700">{result.flow}</div>
            <div className="text-neutral-700">{result.updatedAt ? formatDate(result.updatedAt) : "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchView() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<RequestSearchFilters>({ ...EMPTY_SEARCH_FILTERS, query: initialQuery });
  const [submittedFilters, setSubmittedFilters] = useState<RequestSearchFilters>({
    ...EMPTY_SEARCH_FILTERS,
    query: initialQuery,
  });
  const [results, setResults] = useState<RequestSearchResult[]>(FALLBACK_SEARCH_RESULTS);
  const [count, setCount] = useState(FALLBACK_SEARCH_RESULTS.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facetSource = results.length > 0 ? results : FALLBACK_SEARCH_RESULTS;
  const statusValues = uniqueFacetValues(FALLBACK_SEARCH_RESULTS, "status");
  const assigneeValues = uniqueFacetValues(facetSource, "assignee");
  const flowValues = uniqueFacetValues(facetSource, "flow");
  const tagValues = uniqueFacetValues(facetSource, "tag");
  const totalPages = Math.max(1, Math.ceil(count / filters.pageSize));

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setLoading(true);
      try {
        const response = await searchRequests(submittedFilters);
        if (cancelled) return;
        setResults(response.results);
        setCount(response.count);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        const localResponse = filterLocalSearchResults(FALLBACK_SEARCH_RESULTS, submittedFilters);
        setResults(localResponse.results);
        setCount(localResponse.count);
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        setError(axiosError.response?.data?.detail ?? "Showing local search data; API search is unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [submittedFilters]);

  function updateFilter<K extends keyof RequestSearchFilters>(key: K, value: RequestSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? current.page : 1 }));
  }

  function toggleFacet(key: SearchFacetKey, value: string) {
    setFilters((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [key]: nextValues, page: 1 };
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_SEARCH_FILTERS);
    setSubmittedFilters(EMPTY_SEARCH_FILTERS);
  }

  function goToPage(page: number) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Search Requests</h1>
          <p className="mt-1 text-sm text-neutral-600">Search open and closed requests from one place.</p>
        </div>
        <div className="text-sm font-semibold text-neutral-600">{count} results</div>
      </div>

      <form onSubmit={submitSearch} className="card p-4">
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="search-query">
          Keyword
        </label>
        <div className="flex gap-3">
          <input
            id="search-query"
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            className="h-11 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            placeholder="Search title, id, tags, assignee, comments"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside className="card space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="updated-from">
              Updated from
            </label>
            <input
              id="updated-from"
              type="date"
              value={filters.updatedFrom}
              onChange={(event) => updateFilter("updatedFrom", event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="updated-to">
              Updated to
            </label>
            <input
              id="updated-to"
              type="date"
              value={filters.updatedTo}
              onChange={(event) => updateFilter("updatedTo", event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            />
          </div>

          <FacetGroup
            title="Status"
            facetKey="status"
            values={statusValues}
            selected={filters.status}
            onToggle={toggleFacet}
          />
          <FacetGroup
            title="Assignee"
            facetKey="assignee"
            values={assigneeValues}
            selected={filters.assignee}
            onToggle={toggleFacet}
          />
          <FacetGroup title="Flow" facetKey="flow" values={flowValues} selected={filters.flow} onToggle={toggleFacet} />
          <FacetGroup title="Tag" facetKey="tag" values={tagValues} selected={filters.tag} onToggle={toggleFacet} />
        </aside>

        <div className="space-y-3">
          {loading && <div className="text-sm text-neutral-500">Searching requests...</div>}
          {error && !loading && (
            <div className="rounded-lg border border-warning-500 bg-white px-4 py-3 text-sm text-neutral-800">
              {error}
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="card border-dashed p-6 text-sm text-neutral-600">
              No requests matched the current search and facets.
            </div>
          )}
          {!loading && results.length > 0 && <SearchResultsTable results={results} />}
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <div>
              Page {filters.page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, filters.page - 1))}
                disabled={filters.page <= 1}
                className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, filters.page + 1))}
                disabled={filters.page >= totalPages}
                className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App({ initialView = "home" }: { initialView?: AppView }) {
  const { tenant, logout } = useAuth();
  const [activeView, setActiveView] = useState<AppView>(initialView);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <TopBar
        tenant={tenant}
        onNew={() => alert("New Request is coming in the next step.")}
        onLogout={logout}
      />
      <div className="flex flex-1">
        <SideNav activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 space-y-4 p-6">{activeView === "search" ? <SearchView /> : <HomePage />}</main>
      </div>
    </div>
  );
}
