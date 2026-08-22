import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  downloadReportCsv,
  getReportSummary,
  listReportFlows,
  listReportStatuses,
  listReportUsers,
  type ReportFilters,
  type ReportLookup,
  type ReportSummary,
} from "../../api/adminReports";
import type { FlowStatus } from "../../api/requestCreate";
import type { TenantUser } from "../../api/requestDetail";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";

const EMPTY_FILTERS: ReportFilters = {
  q: "", flowId: "", statusId: "", priority: "", requesterId: "", assigneeId: "",
  createdFrom: "", createdTo: "", updatedFrom: "", updatedTo: "", dueFrom: "", dueTo: "",
};

const URL_FIELDS: Array<[keyof ReportFilters, string]> = [
  ["q", "q"], ["flowId", "flow"], ["statusId", "status"], ["priority", "priority"],
  ["requesterId", "requester"], ["assigneeId", "assignee"], ["createdFrom", "created_from"],
  ["createdTo", "created_to"], ["updatedFrom", "updated_from"], ["updatedTo", "updated_to"],
  ["dueFrom", "due_from"], ["dueTo", "due_to"],
];

function filtersFromUrl(params: URLSearchParams) {
  const filters = { ...EMPTY_FILTERS };
  for (const [field, key] of URL_FIELDS) filters[field] = params.get(key) ?? "";
  return filters;
}

function filtersToUrl(filters: ReportFilters) {
  const params = new URLSearchParams();
  for (const [field, key] of URL_FIELDS) if (filters[field]) params.set(key, filters[field]);
  return params;
}

function inputClass() {
  return "mt-1 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50";
}

function labelPriority(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initial] = useState(() => filtersFromUrl(searchParams));
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [flows, setFlows] = useState<ReportLookup[]>([]);
  const [statuses, setStatuses] = useState<FlowStatus[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const { token, tenant } = useAuth();
  const { context, loading: permissionsLoading } = useAdminPermission(token, tenant);
  const permissions = context?.permissions ?? [];
  const canRead = permissions.includes("reports.read");
  const canExport = permissions.includes("reports.export");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listReportFlows(), listReportUsers()])
      .then(([flowItems, userItems]) => {
        if (!cancelled) { setFlows(flowItems); setUsers(userItems); }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load report filter options.");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!draft.flowId) { setStatuses([]); return; }
    listReportStatuses(draft.flowId)
      .then((items) => { if (!cancelled) setStatuses(items); })
      .catch(() => { if (!cancelled) setStatuses([]); });
    return () => { cancelled = true; };
  }, [draft.flowId]);

  useEffect(() => {
    let cancelled = false;
    if (!canRead) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    getReportSummary(applied)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) { setSummary(null); setError("Could not load report data from the API."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [applied, canRead]);

  function update(field: keyof ReportFilters, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "flowId" ? { statusId: "" } : {}),
    }));
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...draft });
    setSearchParams(filtersToUrl(draft));
  }

  function clear() {
    setDraft({ ...EMPTY_FILTERS });
    setApplied({ ...EMPTY_FILTERS });
    setSearchParams(new URLSearchParams());
  }

  async function exportCsv() {
    setExporting(true);
    setExportMessage(null);
    try {
      const filename = await downloadReportCsv(applied);
      setExportMessage(`Downloaded ${filename}`);
    } catch (requestError) {
      setExportMessage(requestError instanceof Error ? requestError.message : "Could not export the report.");
    } finally {
      setExporting(false);
    }
  }

  if (permissionsLoading) {
    return <LoadingRows rows={4} />;
  }

  if (!canRead) {
    return <ErrorState message="You do not have reports.read permission for this tenant." />;
  }

  const kpis = summary ? [
    ["Total", summary.total], ["Open", summary.open], ["In progress", summary.inProgress],
    ["Waiting", summary.waiting], ["Closed", summary.closed], ["Due today", summary.dueToday],
    ["Overdue", summary.overdue], ["Unassigned", summary.unassigned], ["Assigned to me", summary.assignedToMe],
  ] as const : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-neutral-900">Reports</h2><p className="text-sm text-neutral-600">Tenant request counts and breakdowns from the reporting API.</p></div>
        <button type="button" onClick={() => void exportCsv()} disabled={!canExport || exporting} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
          {exporting ? "Preparing CSV..." : "Export CSV"}
        </button>
      </div>
      {!canExport ? <p className="rounded-lg border border-warning-500 bg-white p-3 text-sm text-neutral-800">CSV export requires reports.export permission.</p> : null}
      {exportMessage ? <p role="status" className="rounded-lg border border-neutral-200 bg-white p-3 text-sm font-semibold text-neutral-700">{exportMessage}</p> : null}

      <form onSubmit={apply} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold text-neutral-700">Search<input value={draft.q} onChange={(e) => update("q", e.target.value)} className={inputClass()} /></label>
          <label className="text-sm font-semibold text-neutral-700">Flow<select value={draft.flowId} onChange={(e) => update("flowId", e.target.value)} className={inputClass()}><option value="">All flows</option>{flows.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="text-sm font-semibold text-neutral-700">Status<select value={draft.statusId} disabled={!draft.flowId} onChange={(e) => update("statusId", e.target.value)} className={inputClass()}><option value="">All statuses</option>{statuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold text-neutral-700">Priority<select value={draft.priority} onChange={(e) => update("priority", e.target.value)} className={inputClass()}><option value="">All priorities</option>{["low", "normal", "high", "urgent"].map((item) => <option key={item} value={item}>{labelPriority(item)}</option>)}</select></label>
          <UserSelect label="Requester" value={draft.requesterId} users={users} onChange={(value) => update("requesterId", value)} />
          <UserSelect label="Assignee" value={draft.assigneeId} users={users} onChange={(value) => update("assigneeId", value)} />
          <DateRange label="Created" from={draft.createdFrom} to={draft.createdTo} onFrom={(value) => update("createdFrom", value)} onTo={(value) => update("createdTo", value)} />
          <DateRange label="Updated" from={draft.updatedFrom} to={draft.updatedTo} onFrom={(value) => update("updatedFrom", value)} onTo={(value) => update("updatedTo", value)} />
          <DateRange label="Due" from={draft.dueFrom} to={draft.dueTo} onFrom={(value) => update("dueFrom", value)} onTo={(value) => update("dueTo", value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-neutral-200 pt-3"><button type="button" onClick={clear} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700">Clear</button><button type="submit" className="btn btn-primary">Apply filters</button></div>
      </form>

      {error ? <ErrorState message={error} onRetry={() => setApplied({ ...applied })} /> : null}
      {loading ? <LoadingRows rows={4} /> : null}
      {!loading && summary ? <>
        <section aria-label="Report summary" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">{kpis.map(([label, value]) => <div key={label} className="rounded-lg border border-neutral-200 bg-white p-4"><div className="text-xs font-semibold uppercase text-neutral-600">{label}</div><div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div></div>)}</section>
        <div className="grid gap-4 xl:grid-cols-2"><Breakdown title="Priority breakdown" headers={["Priority", "Requests"]} rows={summary.byPriority.map((item) => [labelPriority(item.priority), item.count])} /><Breakdown title="Status breakdown" headers={["Status", "Category", "Requests"]} rows={summary.byStatus.map((item) => [item.name, labelPriority(item.category), item.count])} /></div>
      </> : null}
    </div>
  );
}

function UserSelect({ label, value, users, onChange }: { label: string; value: string; users: TenantUser[]; onChange(value: string): void }) {
  return <label className="text-sm font-semibold text-neutral-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass()}><option value="">All {label.toLowerCase()}s</option>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName ?? user.email ?? user.label}</option>)}</select></label>;
}

function DateRange({ label, from, to, onFrom, onTo }: { label: string; from: string; to: string; onFrom(value: string): void; onTo(value: string): void }) {
  return <fieldset className="rounded-lg border border-neutral-200 p-2"><legend className="px-1 text-sm font-semibold text-neutral-700">{label}</legend><div className="grid grid-cols-2 gap-2"><label className="text-xs text-neutral-600">From<input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={inputClass()} /></label><label className="text-xs text-neutral-600">To<input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className={inputClass()} /></label></div></fieldset>;
}

function Breakdown({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white"><h3 className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-900">{title}</h3>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-neutral-700"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-neutral-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="h-12 px-4 text-neutral-800">{cell}</td>)}</tr>)}</tbody></table></div> : <div className="p-4"><EmptyState title="No breakdown data" body="The API returned no values for the applied filters." /></div>}</section>;
}
