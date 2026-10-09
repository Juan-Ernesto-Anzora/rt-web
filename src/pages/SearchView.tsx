import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { InlineNotice } from "../components/common/InlineNotice";
import { LoadingRows } from "../components/common/LoadingRows";
import { PaginationControls } from "../components/common/PaginationControls";
import { RequestTable } from "../components/requests/RequestTable";
import { SearchFiltersPanel } from "../components/search/SearchFiltersPanel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Controls";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import type { CatalogOption } from "../features/searchCatalogs";
import {
  EMPTY_SEARCH, SEARCH_PAGE_SIZE, readSearchState, searchParamsFor,
  searchRequests, validDay, validKeyword,
  type RequestSearchResponse, type SearchState,
} from "../features/requestSearch";

type DraftErrors = { q?: string; flowId?: string; statusId?: string; assigneeId?: string; updatedFrom?: string; updatedTo?: string };
type ResultState = { scope: string; baseScope: string; dataScope: string; data: RequestSearchResponse | null; loading: boolean; error: string | null };

const FIELD_NAMES: Record<string, string> = {
  q: "Search requests", flow_id: "Flow", status_id: "Status", assignee_id: "Assignee",
  updated_from: "Updated from", updated_to: "Updated to", page: "Page",
};

function responseError(error: unknown) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : "Could not load search results.";
  const data = error.response?.data;
  if (!data || typeof data !== "object") return "Could not load search results.";
  const body = data as { message?: unknown; detail?: unknown; details?: unknown };
  const message = typeof body.message === "string" ? body.message : typeof body.detail === "string" ? body.detail : "Could not load search results.";
  const details = Array.isArray(body.details) ? body.details.filter((item): item is { field: string; message: string } =>
    item && typeof item.field === "string" && typeof item.message === "string") : [];
  return details.length ? `${message} ${details.map(item => `${FIELD_NAMES[item.field] ?? item.field}: ${item.message}`).join(" ")}` : message;
}

function responseFieldErrors(error: unknown): DraftErrors {
  if (!axios.isAxiosError(error)) return {};
  const data = error.response?.data;
  if (!data || typeof data !== "object" || !Array.isArray((data as { details?: unknown }).details)) return {};
  const fields: Record<string, keyof DraftErrors> = {
    q: "q", flow_id: "flowId", status_id: "statusId", assignee_id: "assigneeId",
    updated_from: "updatedFrom", updated_to: "updatedTo",
  };
  const errors: DraftErrors = {};
  for (const detail of (data as { details: unknown[] }).details) {
    if (!detail || typeof detail !== "object") continue;
    const item = detail as { field?: unknown; message?: unknown };
    if (typeof item.field === "string" && typeof item.message === "string" && fields[item.field]) {
      errors[fields[item.field]] = item.message;
    }
  }
  return errors;
}

function validateDraft(draft: SearchState): DraftErrors {
  const errors: DraftErrors = {};
  const q = draft.q.trim();
  if (q && !validKeyword(q)) errors.q = "Use searchable letters or numbers, up to 200 characters.";
  if (draft.updatedFrom && !validDay(draft.updatedFrom)) errors.updatedFrom = "Enter a valid date.";
  if (draft.updatedTo && !validDay(draft.updatedTo)) errors.updatedTo = "Enter a valid date.";
  if (draft.updatedFrom && draft.updatedTo && draft.updatedFrom > draft.updatedTo) errors.updatedTo = "Updated to must be on or after Updated from.";
  return errors;
}

function filterCount(state: SearchState) {
  return [state.flowId, state.statusId, state.assigneeId, state.updatedFrom, state.updatedTo].filter(Boolean).length;
}

export default function SearchView() {
  const [params, setParams] = useSearchParams();
  const rawSearch = params.toString();
  const parsed = useMemo(() => readSearchState(new URLSearchParams(rawSearch)), [rawSearch]);
  const scope = parsed.canonical.toString();
  const applied = useMemo(() => readSearchState(new URLSearchParams(scope)).state, [scope]);
  const baseScope = searchParamsFor({ ...applied, page: 1 }).toString();
  const [draft, setDraft] = useState<SearchState>(() => ({ ...applied }));
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [urlWarning, setUrlWarning] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const [known, setKnown] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResultState>({ scope: "", baseScope: "", dataScope: "", data: null, loading: false, error: null });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (parsed.warnings.length) setUrlWarning(parsed.warnings.join(" "));
    if (rawSearch !== scope) setParams(parsed.canonical, { replace: true });
  }, [rawSearch, parsed.canonical, parsed.warnings, scope, setParams]);

  useEffect(() => {
    setDraft({ ...applied });
    setDraftErrors({});
  }, [scope, applied]);

  useEffect(() => {
    let active = true;
    if (!applied.q) {
      setResult({ scope, baseScope, dataScope: scope, data: null, loading: false, error: null });
      return () => { active = false; };
    }
    setResult(current => ({ scope, baseScope, dataScope: current.dataScope, data: current.baseScope === baseScope ? current.data : null, loading: true, error: null }));
    searchRequests(applied).then(data => {
      if (active) setResult({ scope, baseScope, dataScope: scope, data, loading: false, error: null });
    }).catch(error => {
      if (active) {
        const fieldErrors = responseFieldErrors(error);
        if (Object.keys(fieldErrors).length) {
          setDraftErrors(fieldErrors);
          if (Object.keys(fieldErrors).some(field => field !== "q")) setFiltersOpen(true);
        }
        setResult(current => ({ scope, baseScope, dataScope: current.dataScope, data: current.baseScope === baseScope ? current.data : null, loading: false, error: responseError(error) }));
      }
    });
    return () => { active = false; };
  }, [scope, baseScope, applied, retry]);

  const onOptions = useCallback((kind: "flow" | "status" | "assignee", options: CatalogOption[]) => {
    setKnown(current => {
      let changed = false;
      const next = { ...current };
      for (const option of options) {
        const key = `${kind}:${option.id}`;
        if (next[key] !== option.label) { next[key] = option.label; changed = true; }
      }
      return changed ? next : current;
    });
  }, []);

  function commit(next: SearchState) {
    const intended = { ...next, q: next.q.trim(), page: 1 };
    const errors = validateDraft(intended);
    setDraftErrors(errors);
    if (Object.keys(errors).length) return false;
    setUrlWarning("");
    const nextParams = searchParamsFor(intended);
    if (nextParams.toString() === scope) setRetry(value => value + 1);
    else setParams(nextParams);
    return true;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commit(draft);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (commit(draft)) {
      setFiltersOpen(false);
      filterButton.current?.focus();
    }
  }

  function cancelFilters() {
    setDraft({ ...applied });
    setDraftErrors({});
    setFiltersOpen(false);
    filterButton.current?.focus();
  }

  function clearAll() {
    setDraft({ ...EMPTY_SEARCH });
    setDraftErrors({});
    setUrlWarning("");
    setFiltersOpen(false);
    setParams(new URLSearchParams());
  }

  function changeApplied(next: SearchState) {
    setDraftErrors({});
    setUrlWarning("");
    setParams(searchParamsFor({ ...next, page: 1 }));
  }

  const current = result.scope === scope;
  const loading = Boolean(applied.q) && (!current || result.loading);
  const error = current ? result.error : null;
  const data = current && result.dataScope === scope ? result.data : null;
  const pagerData = result.baseScope === baseScope ? result.data : null;
  const count = data?.count ?? 0;
  const rows = data?.results ?? [];
  const chips = [
    { field: "flowId" as const, name: "Flow", value: applied.flowId, label: known[`flow:${applied.flowId}`] ?? "Unavailable flow" },
    { field: "statusId" as const, name: "Status", value: applied.statusId, label: known[`status:${applied.statusId}`] ?? "Unavailable status" },
    { field: "assigneeId" as const, name: "Assignee", value: applied.assigneeId, label: known[`assignee:${applied.assigneeId}`] ?? "Unavailable assignee" },
    { field: "updatedFrom" as const, name: "Updated from", value: applied.updatedFrom, label: applied.updatedFrom },
    { field: "updatedTo" as const, name: "Updated to", value: applied.updatedTo, label: applied.updatedTo },
  ].filter(chip => chip.value);

  return <section className="min-h-[calc(100vh-3.5rem)] space-y-4 bg-background p-4 text-foreground sm:p-6">
    <PageHeader title="Search Requests" />
    {urlWarning ? <InlineNotice tone="warning" message={urlWarning} /> : null}
    <form onSubmit={submitSearch} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1"><Field label="Search requests" description="Searches titles, descriptions, comments and attachment names." error={draftErrors.q}>
        <Input value={draft.q} onChange={event => { setDraft(current => ({ ...current, q: event.target.value, page: 1 })); setDraftErrors(current => ({ ...current, q: undefined })); }} maxLength={200}
          placeholder="Search requests..." />
      </Field></div>
      <Button type="submit" className="sm:mt-6">Search</Button>
      {(draft.q || applied.q || filterCount(applied) > 0) ? <Button variant="ghost" onClick={clearAll} className="self-start sm:mt-6">Clear all</Button> : null}
    </form>

    <div className="flex flex-wrap items-center gap-2">
      <Button ref={filterButton} variant="secondary" size="sm" aria-expanded={filtersOpen} aria-controls="search-filters"
        onClick={() => filtersOpen ? cancelFilters() : setFiltersOpen(true)} className={filtersOpen ? "!bg-surface-active" : ""}>
        {filtersOpen ? "Hide filters" : `Filters${filterCount(applied) ? ` (${filterCount(applied)})` : ""}`}
      </Button>
      {chips.map(chip => <Button key={chip.field} variant="ghost" size="sm"
        aria-label={`Remove ${chip.name} filter: ${chip.label}`}
        onClick={() => changeApplied({ ...applied, [chip.field]: "" })} className="!px-2 !font-medium !text-foreground">
        {chip.name}: {chip.label} <span aria-hidden="true">{"\u00d7"}</span>
      </Button>)}
      {chips.length ? <Button variant="ghost" size="sm" onClick={() => changeApplied({ ...applied, flowId: "", statusId: "", assigneeId: "", updatedFrom: "", updatedTo: "" })}>Clear filters</Button> : null}
    </div>
    {filtersOpen ? <SearchFiltersPanel draft={draft} onChange={setDraft} onApply={applyFilters} onCancel={cancelFilters}
      errors={draftErrors} known={known} onOptions={onOptions} /> : null}

    <section aria-labelledby="search-results-heading" className="min-w-0 space-y-3">
      <div><h2 id="search-results-heading" className="text-lg font-semibold">Results</h2>
        <p role="status" aria-live="polite" className="text-sm text-text-muted">{!applied.q ? "No search yet" : loading && !rows.length ? "Searching requests..." : error ? "Results unavailable" : `${count} results${applied.page > 1 ? `, page ${applied.page}` : ""}`}</p>
      </div>
      {!applied.q ? <EmptyState title="No search yet" body="Enter a keyword to find requests." /> : null}
      {error ? <ErrorState message={error} retryLabel="Retry search" onRetry={() => setRetry(value => value + 1)} /> : null}
      {loading && !rows.length && !error ? <LoadingRows rows={5} /> : null}
      {loading && rows.length > 0 ? <InlineNotice message="Refreshing search results..." /> : null}
      {applied.q && !loading && !error && !rows.length ? <EmptyState
        title={count && applied.page > 1 ? "No results on this page." : "No requests matched this search."}
        body={count && applied.page > 1 ? "Try an earlier page." : `No requests matched "${applied.q}" with the current filters.`}
        action={chips.length ? <Button variant="secondary" size="sm" onClick={() => changeApplied({ ...applied, flowId: "", statusId: "", assigneeId: "", updatedFrom: "", updatedTo: "" })}>Clear filters</Button> : undefined} /> : null}
      {!error && rows.length > 0 ? <div aria-busy={loading}><RequestTable requests={rows} label="Search results" caption="Request search results" fixed /></div> : null}
      {applied.q && pagerData && (pagerData.count > SEARCH_PAGE_SIZE || applied.page > 1) ? <div aria-busy={loading}>
        <PaginationControls page={applied.page} pageSize={SEARCH_PAGE_SIZE}
          count={pagerData.count} label="results" onPageChange={page => { if (!loading) setParams(searchParamsFor({ ...applied, page })); }} />
      </div> : null}
    </section>
  </section>;
}
