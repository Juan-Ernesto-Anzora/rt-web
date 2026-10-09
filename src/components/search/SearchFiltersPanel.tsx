import { FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { listSearchFlows, listSearchStatuses, listSearchUsers, type CatalogOption } from "../../features/searchCatalogs";
import type { SearchState } from "../../features/requestSearch";
import { ErrorState } from "../common/ErrorState";
import { Button } from "../ui/Button";
import { Input, Select } from "../ui/Controls";
import { Field } from "../ui/Field";

type DraftErrors = { q?: string; flowId?: string; statusId?: string; assigneeId?: string; updatedFrom?: string; updatedTo?: string };
type CatalogKind = "flow" | "status" | "assignee";

function message(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && typeof data.message === "string") return data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function SearchFiltersPanel({ draft, onChange, onApply, onCancel, errors, known, onOptions }: {
  draft: SearchState;
  onChange(next: SearchState): void;
  onApply(event: FormEvent<HTMLFormElement>): void;
  onCancel(): void;
  errors: DraftErrors;
  known: Record<string, string>;
  onOptions(kind: CatalogKind, options: CatalogOption[]): void;
}) {
  const [flows, setFlows] = useState<CatalogOption[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [flowsError, setFlowsError] = useState<string | null>(null);
  const [flowRetry, setFlowRetry] = useState(0);
  const [statuses, setStatuses] = useState<CatalogOption[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const [users, setUsers] = useState<CatalogOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersMoreLoading, setUsersMoreLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersNext, setUsersNext] = useState(false);
  const [userRetry, setUserRetry] = useState(0);
  const [userText, setUserText] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const activeUserSearch = useRef(userSearch);
  activeUserSearch.current = userSearch;

  useEffect(() => {
    let active = true;
    setFlowsLoading(true);
    setFlowsError(null);
    listSearchFlows().then(options => {
      if (active) { setFlows(options); onOptions("flow", options); }
    }).catch(error => {
      if (active) setFlowsError(message(error, "Could not load flows."));
    }).finally(() => { if (active) setFlowsLoading(false); });
    return () => { active = false; };
  }, [flowRetry, onOptions]);

  useEffect(() => {
    if (!draft.flowId) { setStatuses([]); setStatusError(null); setStatusLoading(false); return; }
    let active = true;
    setStatuses([]);
    setStatusLoading(true);
    setStatusError(null);
    listSearchStatuses(draft.flowId).then(options => {
      if (active) { setStatuses(options); onOptions("status", options); }
    }).catch(error => {
      if (active) setStatusError(message(error, "Could not load statuses."));
    }).finally(() => { if (active) setStatusLoading(false); });
    return () => { active = false; };
  }, [draft.flowId, statusRetry, onOptions]);

  useEffect(() => {
    let active = true;
    setUsersLoading(true);
    setUsersError(null);
    listSearchUsers(1, userSearch).then(result => {
      if (active) {
        setUsers(result.users); setUsersPage(1); setUsersNext(result.hasNext);
        onOptions("assignee", result.users);
      }
    }).catch(error => {
      if (active) setUsersError(message(error, "Could not load users."));
    }).finally(() => { if (active) setUsersLoading(false); });
    return () => { active = false; };
  }, [userSearch, userRetry, onOptions]);

  async function loadMoreUsers() {
    const requestedSearch = userSearch;
    setUsersMoreLoading(true);
    setUsersError(null);
    try {
      const result = await listSearchUsers(usersPage + 1, requestedSearch);
      if (activeUserSearch.current !== requestedSearch) return;
      setUsers(current => [...current, ...result.users]);
      setUsersPage(value => value + 1);
      setUsersNext(result.hasNext);
      onOptions("assignee", result.users);
    } catch (error) {
      setUsersError(message(error, "Could not load more users."));
    } finally {
      setUsersMoreLoading(false);
    }
  }

  const flowKnown = flows.some(option => option.id === draft.flowId);
  const statusKnown = statuses.some(option => option.id === draft.statusId);
  const userKnown = users.some(option => option.id === draft.assigneeId);

  return <form id="search-filters" aria-label="Search filters" onSubmit={onApply} className="space-y-2 border-y border-border/60 py-3">
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
      <Field label="Flow" error={errors.flowId}>
        <Select value={draft.flowId} onChange={event => onChange({ ...draft, flowId: event.target.value, statusId: "", page: 1 })}>
          <option value="">All flows</option>
          {draft.flowId && !flowKnown ? <option value={draft.flowId}>{known[`flow:${draft.flowId}`] ?? "Unavailable flow"}</option> : null}
          {flows.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </Select>
      </Field>
      <Field label="Status" description={!draft.flowId ? "Select a flow to choose a status." : undefined} error={errors.statusId}>
        <Select value={draft.statusId} disabled={!draft.flowId && !draft.statusId} onChange={event => onChange({ ...draft, statusId: event.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {draft.statusId && !statusKnown ? <option value={draft.statusId}>{known[`status:${draft.statusId}`] ?? "Unavailable status"}</option> : null}
          {statuses.map(option => <option key={option.id} value={option.id}>{option.label}{option.category ? ` (${option.category})` : ""}</option>)}
        </Select>
      </Field>
      <Field label="Assignee" error={errors.assigneeId}>
        <Select value={draft.assigneeId} onChange={event => onChange({ ...draft, assigneeId: event.target.value, page: 1 })}>
          <option value="">All assignees</option>
          {draft.assigneeId && !userKnown ? <option value={draft.assigneeId}>{known[`assignee:${draft.assigneeId}`] ?? "Unavailable assignee"}</option> : null}
          {users.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </Select>
      </Field>
      <div className="grid min-w-0 gap-2 sm:col-span-2 sm:flex sm:flex-wrap sm:items-end xl:col-span-3">
        <div className="min-w-0 sm:min-w-[140px] sm:flex-1"><Field label="Find assignee"><Input value={userText} onChange={event => setUserText(event.target.value)} /></Field></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setUserSearch(userText.trim()); setUserRetry(value => value + 1); }}>Find users</Button>
          {usersNext ? <Button variant="ghost" size="sm" loading={usersMoreLoading} onClick={() => void loadMoreUsers()}>Load more users</Button> : null}
        </div>
      </div>
      <Field label="Updated from" error={errors.updatedFrom}><Input type="date" value={draft.updatedFrom} onChange={event => onChange({ ...draft, updatedFrom: event.target.value, page: 1 })} /></Field>
      <Field label="Updated to" error={errors.updatedTo}><Input type="date" value={draft.updatedTo} onChange={event => onChange({ ...draft, updatedTo: event.target.value, page: 1 })} /></Field>
    </div>
    {flowsLoading ? <p role="status" className="text-sm text-text-muted">Loading flows...</p> : null}
    {!flowsLoading && !flowsError && !flows.length ? <p role="status" className="text-sm text-text-muted">No flows available.</p> : null}
    {statusLoading ? <p role="status" className="text-sm text-text-muted">Loading statuses...</p> : null}
    {draft.flowId && !statusLoading && !statusError && !statuses.length ? <p role="status" className="text-sm text-text-muted">No statuses available for this flow.</p> : null}
    {usersLoading ? <p role="status" className="text-sm text-text-muted">Loading users...</p> : null}
    {!usersLoading && !usersError && !users.length ? <p role="status" className="text-sm text-text-muted">{userSearch ? "No users match this search." : "No users available."}</p> : null}
    {flowsError ? <ErrorState message={flowsError} retryLabel="Retry flows" onRetry={() => setFlowRetry(value => value + 1)} /> : null}
    {statusError ? <ErrorState message={statusError} retryLabel="Retry statuses" onRetry={() => setStatusRetry(value => value + 1)} /> : null}
    {usersError ? <ErrorState message={usersError} retryLabel="Retry users" onRetry={() => setUserRetry(value => value + 1)} /> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button type="submit">Apply filters</Button>
    </div>
  </form>;
}
