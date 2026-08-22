import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listAdminAudit, type AdminAuditFilters, type AdminAuditRecord } from "../../api/adminAudit";
import { adminApiError } from "../../api/adminDirectory";
import { listTenantUsers, type TenantUser } from "../../api/requestDetail";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";
import { PaginationControls } from "../../components/common/PaginationControls";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function eventLabel(value: string) {
  return value.split(".").map((part) => part.replace(/_/g, " ")).join(" · ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function filtersFromParams(params: URLSearchParams): Required<Pick<AdminAuditFilters, "page" | "pageSize">> & AdminAuditFilters {
  return {
    type: params.get("type") ?? "",
    actorId: params.get("actor") ?? "",
    requestId: params.get("request") ?? "",
    entityId: params.get("entity") ?? "",
    createdFrom: params.get("from") ?? "",
    createdTo: params.get("to") ?? "",
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: [10, 25, 50, 100].includes(Number(params.get("page_size"))) ? Number(params.get("page_size")) : 25,
  };
}

function toParams(filters: AdminAuditFilters) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.actorId) params.set("actor", filters.actorId);
  if (filters.requestId) params.set("request", filters.requestId);
  if (filters.entityId) params.set("entity", filters.entityId);
  if (filters.createdFrom) params.set("from", filters.createdFrom);
  if (filters.createdTo) params.set("to", filters.createdTo);
  params.set("page", String(filters.page ?? 1));
  params.set("page_size", String(filters.pageSize ?? 25));
  return params;
}

function entityLink(record: AdminAuditRecord, permissions: string[]) {
  if (record.requestId) return { to: `/requests/${encodeURIComponent(record.requestId)}`, label: "Open request" };
  const type = record.entityType;
  if ((type === "user" || type === "membership") && permissions.includes("admin.users")) return { to: "/admin/users", label: "Open Users" };
  if (type === "role" && permissions.includes("admin.roles")) return { to: "/admin/roles", label: "Open Roles" };
  if (["workflow", "status", "transition"].includes(type ?? "")) return { to: "/admin/workflows", label: "Open Workflows" };
  if (type === "sla_policy" && permissions.includes("sla.manage")) return { to: "/admin/sla", label: "Open SLA policies" };
  if (type === "notification_template" && permissions.includes("notifications.manage")) return { to: "/admin/settings", label: "Open Settings" };
  return null;
}

function PayloadDetails({ record }: { record: AdminAuditRecord }) {
  const value = record.payloadJson;
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index + 1), item] as const) : value ? Object.entries(value) : [];
  return <details><summary className="cursor-pointer font-semibold text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">View details</summary><dl className="mt-2 max-w-xl space-y-2 rounded-lg bg-neutral-50 p-3 text-xs">{entries.length ? entries.map(([key, item]) => <div key={key} className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="font-semibold text-neutral-700">{key.replace(/_/g, " ")}</dt><dd className="min-w-0 break-words text-neutral-800">{item !== null && typeof item === "object" ? <pre className="overflow-auto whitespace-pre-wrap break-words font-mono">{JSON.stringify(item, null, 2)}</pre> : String(item ?? "—")}</dd></div>) : <div><dt className="sr-only">Payload</dt><dd className="whitespace-pre-wrap break-words text-neutral-700">{record.payload ? record.payload.slice(0, 4000) : "Payload unavailable."}</dd></div>}</dl></details>;
}

export default function AdminAuditPage() {
  const { token, tenant } = useAuth();
  const { context, loading: permissionLoading } = useAdminPermission(token, tenant);
  const canRead = context?.permissions.includes("admin.audit.read") ?? false;
  const permissions = context?.permissions ?? [];
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => filtersFromParams(params), [params]);
  const [draft, setDraft] = useState(applied);
  const [records, setRecords] = useState<AdminAuditRecord[]>([]);
  const [actors, setActors] = useState<TenantUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const actorLabels = useMemo(() => new Map(actors.map((actor) => [actor.id, actor.displayName ?? actor.email ?? actor.label])), [actors]);

  useEffect(() => { setDraft(applied); }, [applied]);
  useEffect(() => {
    let cancelled = false;
    if (!canRead) return;
    listTenantUsers().then((items) => { if (!cancelled) setActors(items); }).catch(() => { if (!cancelled) setActors([]); });
    return () => { cancelled = true; };
  }, [canRead, tenant]);
  useEffect(() => {
    let cancelled = false;
    if (!canRead) return;
    setLoading(true); setError(null);
    listAdminAudit(applied).then((page) => { if (!cancelled) { setRecords(page.results); setCount(page.count); } }).catch((requestError) => { if (!cancelled) { setRecords([]); setCount(0); setError(adminApiError(requestError, "Could not load tenant audit records.")); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [applied, canRead]);

  if (permissionLoading) return <LoadingRows rows={5} />;
  if (!canRead) return <ErrorState message="The admin.audit.read permission is required to view tenant audit records." />;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (draft.requestId && !UUID_PATTERN.test(draft.requestId)) { setFilterError("Request ID must be a valid UUID."); return; }
    if (draft.entityId && !UUID_PATTERN.test(draft.entityId)) { setFilterError("Entity ID must be a valid UUID."); return; }
    if (draft.createdFrom && draft.createdTo && draft.createdTo < draft.createdFrom) { setFilterError("Created to must be on or after created from."); return; }
    setFilterError(null); setParams(toParams({ ...draft, page: 1 }));
  }

  const inputClass = "mt-1 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600";
  return <div className="space-y-4"><header><h2 className="text-xl font-semibold text-neutral-900">Audit</h2><p className="text-sm text-neutral-600">Tenant administration and request activity history.</p></header>
    <form onSubmit={applyFilters} className="rounded-lg border border-neutral-200 bg-white p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-semibold text-neutral-700">Event type<input value={draft.type ?? ""} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="admin.role.updated" className={inputClass} /></label><label className="text-sm font-semibold text-neutral-700">Actor<select value={draft.actorId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, actorId: event.target.value }))} className={inputClass}><option value="">All actors</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.displayName ?? actor.email ?? actor.label}</option>)}</select></label><label className="text-sm font-semibold text-neutral-700">Request ID<input value={draft.requestId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, requestId: event.target.value.trim() }))} className={inputClass} /></label><label className="text-sm font-semibold text-neutral-700">Entity ID<input value={draft.entityId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, entityId: event.target.value.trim() }))} className={inputClass} /></label><label className="text-sm font-semibold text-neutral-700">Created from<input type="date" value={draft.createdFrom ?? ""} onChange={(event) => setDraft((current) => ({ ...current, createdFrom: event.target.value }))} className={inputClass} /></label><label className="text-sm font-semibold text-neutral-700">Created to<input type="date" min={draft.createdFrom || undefined} value={draft.createdTo ?? ""} onChange={(event) => setDraft((current) => ({ ...current, createdTo: event.target.value }))} className={inputClass} /></label><label className="text-sm font-semibold text-neutral-700">Page size<select value={draft.pageSize ?? 25} onChange={(event) => setDraft((current) => ({ ...current, pageSize: Number(event.target.value) }))} className={inputClass}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>{filterError ? <p role="alert" className="mt-3 text-sm font-semibold text-danger-500">{filterError}</p> : null}<div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3"><button type="button" onClick={() => { const empty = filtersFromParams(new URLSearchParams()); setDraft(empty); setParams(toParams(empty)); setFilterError(null); }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Clear</button><button type="submit" className="btn btn-primary">Apply filters</button></div></form>
    {error ? <ErrorState message={error} onRetry={() => setParams(new URLSearchParams(params))} /> : null}
    {loading ? <LoadingRows rows={6} /> : !error && records.length === 0 ? <EmptyState title="No audit records" body="No tenant audit activity matches the current filters." /> : !error ? <div role="region" aria-label="Tenant audit records" tabIndex={0} className="overflow-x-auto rounded-lg border border-neutral-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Tenant audit records</caption><thead className="bg-neutral-50 text-neutral-700"><tr><th scope="col" className="px-4 py-3">Event</th><th scope="col" className="px-4 py-3">Actor</th><th scope="col" className="px-4 py-3">Entity</th><th scope="col" className="px-4 py-3">Timestamp</th><th scope="col" className="px-4 py-3">Payload</th></tr></thead><tbody className="divide-y divide-neutral-100">{records.map((record) => { const target = entityLink(record, permissions); return <tr key={record.activityId} className="align-top hover:bg-neutral-50"><td className="px-4 py-3"><div className="font-semibold text-neutral-900">{eventLabel(record.type)}</div><code className="text-xs text-neutral-600">{record.type}</code></td><td className="px-4 py-3 text-neutral-700">{record.actorId ? actorLabels.get(record.actorId) ?? "Unknown actor" : "System"}</td><td className="px-4 py-3"><div className="capitalize text-neutral-700">{record.entityType?.replace(/_/g, " ") ?? (record.requestId ? "Request" : "Tenant")}</div>{target ? <Link to={target.to} className="text-sm font-semibold text-primary-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">{target.label}</Link> : null}</td><td className="whitespace-nowrap px-4 py-3 text-neutral-700">{formatDate(record.createdAt)}</td><td className="px-4 py-3"><PayloadDetails record={record} /></td></tr>; })}</tbody></table></div> : null}
    <PaginationControls page={applied.page} pageSize={applied.pageSize} count={count} label="records" onPageChange={(page) => setParams(toParams({ ...applied, page }))} />
  </div>;
}
