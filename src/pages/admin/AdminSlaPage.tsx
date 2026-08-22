import { FormEvent, useEffect, useState } from "react";
import { createSlaPolicy, listSlaPolicies, slaApiError, updateSlaPolicy, type SlaFieldErrors, type SlaPolicy, type SlaPolicyWrite, type SlaPriority } from "../../api/adminSla";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { AdminDialog, ConfirmDialog } from "../../components/admin/AdminDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";

const PRIORITIES: SlaPriority[] = ["low", "normal", "high", "urgent"];

function durationHint(minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 1) return "Enter whole minutes.";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainder = minutes % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""].filter(Boolean).join(" ");
}

export default function AdminSlaPage() {
  const { token, tenant } = useAuth();
  const { context, loading: permissionsLoading } = useAdminPermission(token, tenant);
  const canManage = context?.permissions.includes("sla.manage") ?? false;
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [isActive, setIsActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<SlaPolicy | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<SlaPolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!canManage) { setLoading(false); return; }
    setLoading(true); setError(null);
    listSlaPolicies({ page, search, priority, isActive })
      .then((result) => { if (!cancelled) { setPolicies(result.results); setCount(result.count); } })
      .catch((requestError) => { if (!cancelled) setError(slaApiError(requestError).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canManage, page, search, priority, isActive, refreshKey]);

  if (permissionsLoading) return <LoadingRows rows={5} />;
  if (!canManage) return <ErrorState message="You do not have sla.manage permission for this tenant." />;

  async function deactivate() {
    if (!deactivating) return;
    setBusy(true); setError(null);
    try {
      await updateSlaPolicy(deactivating.id, { is_active: false });
      setNotice(`${deactivating.name} was deactivated.`); setDeactivating(null); setRefreshKey((key) => key + 1);
    } catch (requestError) { setError(slaApiError(requestError).message); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-neutral-900">SLA policies</h2><p className="text-sm text-neutral-600">Response and resolution targets for tenant request priorities.</p></div><button type="button" onClick={() => setEditing("new")} className="btn btn-primary">New SLA policy</button></div>
    {notice ? <p role="status" className="rounded-lg border border-accent-500 bg-white p-3 text-sm font-semibold text-neutral-800">{notice}</p> : null}
    {error ? <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} /> : null}
    <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
      <label className="text-sm font-semibold text-neutral-700">Search<input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
      <label className="text-sm font-semibold text-neutral-700">Priority<select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3"><option value="">All</option>{PRIORITIES.map((item) => <option key={item} value={item}>{item.replace(/^./, (c) => c.toUpperCase())}</option>)}</select></label>
      <label className="text-sm font-semibold text-neutral-700">State<select value={isActive} onChange={(e) => { setPage(1); setIsActive(e.target.value); }} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3"><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
      <button type="button" onClick={() => { setPage(1); setSearch(""); setPriority(""); setIsActive(""); }} className="self-end rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Clear</button>
    </div>
    {loading ? <LoadingRows rows={5} /> : policies.length === 0 ? <EmptyState title="No SLA policies" body="No policies match the current filters." /> : <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-700"><tr><th className="px-4 py-3">Policy</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Resolution</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">{policies.map((policy) => <tr key={policy.id} className="h-12 hover:bg-neutral-50"><td className="px-4 font-semibold text-neutral-900">{policy.name}</td><td className="px-4 capitalize">{policy.priority}</td><td className="px-4">{policy.responseMinutes} min <span className="text-neutral-600">({durationHint(policy.responseMinutes)})</span></td><td className="px-4">{policy.resolutionMinutes} min <span className="text-neutral-600">({durationHint(policy.resolutionMinutes)})</span></td><td className="px-4">{policy.isActive ? "Active" : "Inactive"}</td><td className="px-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(policy)} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold">Edit</button>{policy.isActive ? <button type="button" onClick={() => setDeactivating(policy)} className="rounded-lg border border-danger-500 px-3 py-2 font-semibold text-danger-500">Deactivate</button> : null}</div></td></tr>)}</tbody></table></div>}
    <div className="flex items-center justify-between text-sm text-neutral-700"><span>{count} policies</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-neutral-300 px-3 py-2 disabled:opacity-50">Previous</button><span className="px-2 py-2">Page {page}</span><button type="button" disabled={page * 25 >= count} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-neutral-300 px-3 py-2 disabled:opacity-50">Next</button></div></div>
    <SlaPolicyDialog policy={editing} busy={busy} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice("SLA policy saved."); setRefreshKey((key) => key + 1); }} onBusy={setBusy} />
    <ConfirmDialog open={Boolean(deactivating)} title="Deactivate SLA policy?" body={deactivating ? `${deactivating.name} will remain visible but will no longer be active.` : ""} confirmLabel="Deactivate" busy={busy} onClose={() => setDeactivating(null)} onConfirm={() => void deactivate()} />
  </div>;
}

function SlaPolicyDialog({ policy, busy, onClose, onSaved, onBusy }: { policy: SlaPolicy | "new" | null; busy: boolean; onClose(): void; onSaved(): void; onBusy(value: boolean): void }) {
  const current = policy === "new" || !policy ? null : policy;
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<SlaPriority>("normal");
  const [responseMinutes, setResponseMinutes] = useState("120");
  const [resolutionMinutes, setResolutionMinutes] = useState("1440");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<SlaFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { setName(current?.name ?? ""); setPriority(current?.priority ?? "normal"); setResponseMinutes(String(current?.responseMinutes ?? 120)); setResolutionMinutes(String(current?.resolutionMinutes ?? 1440)); setIsActive(current?.isActive ?? true); setFields({}); setFormError(null); }, [current?.isActive, current?.name, current?.priority, current?.resolutionMinutes, current?.responseMinutes, policy]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = Number(responseMinutes); const resolution = Number(resolutionMinutes);
    const nextFields: SlaFieldErrors = {};
    if (!name.trim()) nextFields.name = "Name is required.";
    if (!Number.isInteger(response) || response < 1) nextFields.response_minutes = "Enter a whole number of minutes greater than zero.";
    if (!Number.isInteger(resolution) || resolution < 1) nextFields.resolution_minutes = "Enter a whole number of minutes greater than zero.";
    if (Number.isInteger(response) && Number.isInteger(resolution) && response > resolution) nextFields.response_minutes = "Response minutes cannot exceed resolution minutes.";
    setFields(nextFields); setFormError(null);
    if (Object.keys(nextFields).length) return;
    const payload: SlaPolicyWrite = { name: name.trim(), priority: priority.toLowerCase() as SlaPriority, response_minutes: response, resolution_minutes: resolution, is_active: isActive };
    onBusy(true);
    try { if (current) await updateSlaPolicy(current.id, payload); else await createSlaPolicy(payload); onSaved(); }
    catch (requestError) { const parsed = slaApiError(requestError); setFields(parsed.fields); setFormError(parsed.message); }
    finally { onBusy(false); }
  }

  const fieldClass = "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-50";
  return <AdminDialog open={Boolean(policy)} title={current ? "Edit SLA policy" : "Create SLA policy"} description="Targets are stored and submitted as integer minutes." onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-neutral-700">Name *<input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(fields.name)} className={fieldClass} />{fields.name ? <span className="mt-1 block text-xs text-danger-500">{fields.name}</span> : null}</label><label className="block text-sm font-semibold text-neutral-700">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as SlaPriority)} className={fieldClass}>{PRIORITIES.map((item) => <option key={item} value={item}>{item.replace(/^./, (c) => c.toUpperCase())}</option>)}</select>{fields.priority ? <span className="mt-1 block text-xs text-danger-500">{fields.priority}</span> : null}</label><div className="grid gap-3 sm:grid-cols-2"><MinuteField label="Response minutes" value={responseMinutes} error={fields.response_minutes} onChange={setResponseMinutes} /><MinuteField label="Resolution minutes" value={resolutionMinutes} error={fields.resolution_minutes} onChange={setResolutionMinutes} /></div><label className="flex items-center gap-2 text-sm font-semibold text-neutral-700"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active policy</label>{formError ? <p className="text-sm font-semibold text-danger-500">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">{busy ? "Saving..." : "Save policy"}</button></div></form></AdminDialog>;
}

function MinuteField({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange(value: string): void }) {
  const numeric = Number(value);
  return <label className="block text-sm font-semibold text-neutral-700">{label} *<input type="number" min="1" step="1" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" />{error ? <span className="mt-1 block text-xs text-danger-500">{error}</span> : <span className="mt-1 block text-xs font-normal text-neutral-600">{durationHint(numeric)}</span>}</label>;
}
