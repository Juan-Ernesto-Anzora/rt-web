import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { PaginationControls } from "../components/common/PaginationControls";
import { StatusBadge } from "../components/requests/StatusBadge";
import { RequestSearchFilters, RequestSearchResult, searchRequests, SearchFacetKey } from "../features/requestSearch";

const EMPTY_SEARCH_FILTERS: RequestSearchFilters = {
  query: "", status: [], assignee: [], flow: [], tag: [],
  updatedFrom: "", updatedTo: "", page: 1, pageSize: 25, sort: "-updated_at",
};

function formatDate(value: string) {
  if (Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function SearchResultsTable({
  results,
  onOpenRequest,
}: {
  results: RequestSearchResult[];
  onOpenRequest(requestId: string): void;
}) {
  return (
    <div role="region" aria-label="Search results" tabIndex={0} className="overflow-x-auto rounded-lg border border-neutral-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
      <table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Request search results</caption><thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600"><tr><th scope="col" className="px-4 py-3">ID</th><th scope="col" className="px-4 py-3">Request</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Assignee</th><th scope="col" className="px-4 py-3">Requester</th><th scope="col" className="px-4 py-3">Flow</th><th scope="col" className="px-4 py-3">Updated</th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-neutral-100">
        {results.map((result) => (
          <tr key={result.id} className="min-h-12 hover:bg-primary-50"><td className="px-4 font-semibold text-neutral-800">{result.id}</td><td className="max-w-80 px-4 py-2"><div className="min-w-0">
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
            </div></td><td className="px-4"><StatusBadge status={result.status} category={result.statusCategory} /></td><td className="max-w-40 truncate px-4 text-neutral-700">{result.assignee}</td><td className="max-w-40 truncate px-4 text-neutral-700">{result.requester}</td><td className="max-w-40 truncate px-4 text-neutral-700">{result.flow}</td><td className="px-4 text-neutral-700">{result.updatedAt ? formatDate(result.updatedAt) : "-"}</td><td className="px-4 text-right"><button type="button" onClick={() => result.requestId && onOpenRequest(result.requestId)} disabled={!result.requestId} aria-label={`Open request ${result.id}`} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-50">Open</button></td></tr>
        ))}
      </tbody></table>
    </div>
  );
}

export default function SearchView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<RequestSearchFilters>({ ...EMPTY_SEARCH_FILTERS, query: initialQuery });
  const [submittedFilters, setSubmittedFilters] = useState<RequestSearchFilters>({
    ...EMPTY_SEARCH_FILTERS,
    query: initialQuery,
  });
  const [results, setResults] = useState<RequestSearchResult[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusValues = uniqueFacetValues(results, "status");
  const assigneeValues = uniqueFacetValues(results, "assignee");
  const flowValues = uniqueFacetValues(results, "flow");
  const tagValues = uniqueFacetValues(results, "tag");

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!submittedFilters.query.trim()) {
        setResults([]);
        setCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await searchRequests(submittedFilters);
        if (cancelled) return;
        setResults(response.results);
        setCount(response.count);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        setResults([]);
        setCount(0);
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        setError(axiosError.response?.data?.detail ?? "Could not load search results from API.");
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

  useEffect(() => {
    const nextFilters = { ...EMPTY_SEARCH_FILTERS, query: initialQuery };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }, [initialQuery]);

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
    <section className="legacy-page space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <div className="flex flex-col gap-3 sm:flex-row">
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

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
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
            <div role="alert" className="rounded-lg border border-danger-500 bg-white px-4 py-3 text-sm text-danger-500">
              {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="card border-dashed p-6 text-sm text-neutral-600">
              {submittedFilters.query.trim()
                ? "No requests matched the current search and facets."
                : "Enter a keyword to search requests."}
            </div>
          )}
          {!loading && results.length > 0 && (
            <SearchResultsTable
              results={results}
              onOpenRequest={(requestId) => navigate(`/requests/${encodeURIComponent(requestId)}`)}
            />
          )}
          <PaginationControls page={filters.page} pageSize={filters.pageSize} count={count} label="results" onPageChange={goToPage} />
        </div>
      </div>
    </section>
  );
}
