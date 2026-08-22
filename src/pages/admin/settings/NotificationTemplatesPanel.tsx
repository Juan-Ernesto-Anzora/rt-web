import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  configurationApiError,
  getNotificationTemplate,
  listNotificationTemplates,
  saveNotificationTemplate,
  type NotificationTemplate,
  type TemplateUpdate,
} from "../../../api/adminSettings";
import { ConfirmDialog } from "../../../components/admin/AdminDialog";
import { EmptyState } from "../../../components/common/EmptyState";
import { ErrorState } from "../../../components/common/ErrorState";
import { LoadingRows } from "../../../components/common/LoadingRows";

const EVENT_DEFINITIONS = [
  { eventType: "request.created", label: "Request created" },
  { eventType: "request.assigned", label: "Request assigned" },
  { eventType: "comment.added", label: "Comment added" },
  { eventType: "request.closed", label: "Request closed" },
] as const;

const SAMPLE_VALUES: Record<string, string> = {
  human_id: "RT-2026-000123",
  title: "VPN access request",
  request_id: "11111111-2222-4333-8444-555555555555",
  request_url: "https://rt.example.test/requests/11111111-2222-4333-8444-555555555555",
  requester_name: "Ana Requester",
  assignee_name: "Alex Agent",
  comment_author: "Maria User",
  status_name: "In Progress",
};

export const ALLOWED_TEMPLATE_PLACEHOLDERS = Object.keys(SAMPLE_VALUES);

export function renderTemplatePreview(template: string) {
  let text = "";
  const errors = new Set<string>();
  for (let index = 0; index < template.length;) {
    const character = template[index];
    if (character === "{" && template[index + 1] === "{") { text += "{"; index += 2; continue; }
    if (character === "}" && template[index + 1] === "}") { text += "}"; index += 2; continue; }
    if (character === "{") {
      const closing = template.indexOf("}", index + 1);
      if (closing < 0) { errors.add("Template braces are malformed."); text += template.slice(index); break; }
      const token = template.slice(index + 1, closing);
      if (Object.prototype.hasOwnProperty.call(SAMPLE_VALUES, token)) text += SAMPLE_VALUES[token];
      else { text += template.slice(index, closing + 1); errors.add(`Unsupported placeholder: {${token}}.`); }
      index = closing + 1; continue;
    }
    if (character === "}") errors.add("Template braces are malformed.");
    text += character; index += 1;
  }
  return { text, errors: [...errors] };
}

type Draft = { subject: string; body: string; active: boolean };
type FieldErrors = Partial<Record<"subject_template" | "body_template", string>>;

function toDraft(template: NotificationTemplate | null): Draft {
  return { subject: template?.subjectTemplate ?? "", body: template?.bodyTemplate ?? "", active: template?.isActive ?? false };
}

function eventLabel(eventType: string) {
  return EVENT_DEFINITIONS.find((item) => item.eventType === eventType)?.label ?? eventType;
}

export default function NotificationTemplatesPanel({ canManage, onDirtyChange }: { canManage: boolean; onDirtyChange(dirty: boolean): void }) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(null));
  const [loading, setLoading] = useState(canManage);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const snapshot = useMemo(() => toDraft(selected), [selected]);
  const dirty = draft.subject !== snapshot.subject || draft.body !== snapshot.body || draft.active !== snapshot.active;
  const subjectPreview = useMemo(() => renderTemplatePreview(draft.subject), [draft.subject]);
  const bodyPreview = useMemo(() => renderTemplatePreview(draft.body), [draft.body]);

  const loadList = useCallback(async () => {
    if (!canManage) return;
    setLoading(true); setError(null);
    try {
      const next = await listNotificationTemplates();
      setTemplates(next);
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? "");
    } catch (requestError) { setError(configurationApiError(requestError, "Could not load notification templates.").message); }
    finally { setLoading(false); }
  }, [canManage]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) { setSelected(null); setDraft(toDraft(null)); return; }
    setDetailLoading(true); setError(null); setSelected(null);
    try { const next = await getNotificationTemplate(id); setSelected(next); setDraft(toDraft(next)); setFieldErrors({}); }
    catch (requestError) { setError(configurationApiError(requestError, "Could not load the notification template.").message); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [loadDetail, selectedId]);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);

  if (!canManage) return <SectionPermission />;
  if (loading) return <LoadingRows rows={4} />;
  if (!templates.length) return <section className="space-y-3">{error ? <ErrorState message={error} onRetry={() => void loadList()} /> : null}<EmptyState title="No notification templates" body="The API returned no templates for this tenant." /></section>;

  function requestSelection(id: string) {
    if (id === selectedId) return;
    if (dirty) setPendingSelection(id); else { setSelectedId(id); setNotice(null); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    const nextErrors: FieldErrors = {};
    if (!draft.subject.trim()) nextErrors.subject_template = "Subject cannot be blank.";
    else if (/\r|\n/.test(draft.subject)) nextErrors.subject_template = "Subject must be one line.";
    else if (draft.subject.length > 500) nextErrors.subject_template = "Subject cannot exceed 500 characters.";
    else if (subjectPreview.errors.length) nextErrors.subject_template = subjectPreview.errors.join(" ");
    if (!draft.body.trim()) nextErrors.body_template = "Body cannot be blank.";
    else if (draft.body.length > 20000) nextErrors.body_template = "Body cannot exceed 20,000 characters.";
    else if (bodyPreview.errors.length) nextErrors.body_template = bodyPreview.errors.join(" ");
    setFieldErrors(nextErrors); setError(null); setNotice(null);
    if (Object.keys(nextErrors).length) return;
    const payload: TemplateUpdate = {};
    if (draft.subject !== selected.subjectTemplate) payload.subject_template = draft.subject;
    if (draft.body !== selected.bodyTemplate) payload.body_template = draft.body;
    if (draft.active !== selected.isActive) payload.is_active = draft.active;
    if (!Object.keys(payload).length) return;
    setSaving(true);
    try {
      await saveNotificationTemplate(selected.id, payload);
      const [refreshedList, refreshedDetail] = await Promise.all([listNotificationTemplates(), getNotificationTemplate(selected.id)]);
      setTemplates(refreshedList); setSelected(refreshedDetail); setDraft(toDraft(refreshedDetail)); setNotice("Notification template saved.");
    } catch (requestError) {
      const parsed = configurationApiError(requestError, "Could not save the notification template.");
      const mapped: FieldErrors = {};
      for (const detail of parsed.details) {
        if (detail.field === "subject_template" || detail.field === "body_template") mapped[detail.field] = detail.message;
      }
      setFieldErrors(mapped); setError(parsed.message);
    } finally { setSaving(false); }
  }

  return <section aria-labelledby="notification-templates-title" className="space-y-4">
    <div><h3 id="notification-templates-title" className="text-lg font-semibold text-neutral-900">Notification templates</h3><p className="text-sm text-neutral-600">Plain-text tenant overrides. Inactive templates fall back to built-in notification text.</p></div>
    {error ? <ErrorState message={error} onRetry={() => selectedId ? void loadDetail(selectedId) : void loadList()} /> : null}
    {notice ? <p role="status" className="rounded-lg border border-accent-500 bg-white p-3 text-sm font-semibold text-neutral-800">{notice}</p> : null}
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"><nav aria-label="Notification event templates" className="h-fit space-y-1 rounded-lg border border-neutral-200 bg-white p-2">{EVENT_DEFINITIONS.map((definition) => {
      const template = templates.find((item) => item.eventType === definition.eventType);
      if (!template) return <div key={definition.eventType} className="px-3 py-2 text-sm text-danger-500">{definition.label}: missing</div>;
      return <button key={template.id} type="button" onClick={() => requestSelection(template.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${selectedId === template.id ? "bg-primary-600 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}><span className="block">{definition.label}</span><span className={`block text-xs font-normal ${selectedId === template.id ? "text-primary-50" : "text-neutral-600"}`}>{template.isActive ? "Active" : "Built-in fallback"}</span></button>;
    })}</nav>{detailLoading ? <LoadingRows rows={5} /> : !selected ? <EmptyState title="Template unavailable" body="Select or retry a notification template." /> : <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-neutral-900">{eventLabel(selected.eventType)}</h4><p className="text-xs text-neutral-600">Event type is managed by the API and cannot be renamed.</p></div><label className="flex items-center gap-2 text-sm font-semibold text-neutral-700"><input type="checkbox" checked={draft.active} disabled={saving} onChange={(event) => { setDraft((current) => ({ ...current, active: event.target.checked })); setNotice(null); }} />Active override</label></div>
      <label className="block text-sm font-semibold text-neutral-700">Subject *<input value={draft.subject} maxLength={500} disabled={saving} onChange={(event) => { setDraft((current) => ({ ...current, subject: event.target.value })); setFieldErrors((current) => ({ ...current, subject_template: undefined })); setNotice(null); }} aria-invalid={Boolean(fieldErrors.subject_template)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" />{fieldErrors.subject_template ? <span className="mt-1 block text-xs text-danger-500">{fieldErrors.subject_template}</span> : null}</label>
      <label className="block text-sm font-semibold text-neutral-700">Body *<textarea value={draft.body} maxLength={20000} rows={10} disabled={saving} onChange={(event) => { setDraft((current) => ({ ...current, body: event.target.value })); setFieldErrors((current) => ({ ...current, body_template: undefined })); setNotice(null); }} aria-invalid={Boolean(fieldErrors.body_template)} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" />{fieldErrors.body_template ? <span className="mt-1 block text-xs text-danger-500">{fieldErrors.body_template}</span> : null}</label>
      <fieldset className="rounded-lg border border-neutral-200 p-3"><legend className="px-1 text-sm font-semibold text-neutral-800">Allowed placeholders</legend><div className="flex flex-wrap gap-2">{ALLOWED_TEMPLATE_PLACEHOLDERS.map((placeholder) => <code key={placeholder} className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{`{${placeholder}}`}</code>)}</div></fieldset>
      <div className="grid gap-3 xl:grid-cols-2"><Preview title="Subject preview" result={subjectPreview} /><Preview title="Body preview" result={bodyPreview} /></div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3"><button type="button" disabled={!dirty || saving} onClick={() => { setDraft(snapshot); setFieldErrors({}); setNotice(null); }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Cancel edits</button><button type="button" disabled={saving} onClick={() => void loadDetail(selected.id)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Reset from server</button><button type="submit" disabled={!dirty || saving} className="btn btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save template"}</button></div>
    </form>}</div>
    <ConfirmDialog open={Boolean(pendingSelection)} title="Discard template changes?" body="Unsaved changes in the current notification template will be discarded." confirmLabel="Discard changes" busy={false} onClose={() => setPendingSelection(null)} onConfirm={() => { if (pendingSelection) { setDraft(snapshot); setSelectedId(pendingSelection); setPendingSelection(null); setNotice(null); } }} />
  </section>;
}

function Preview({ title, result }: { title: string; result: { text: string; errors: string[] } }) {
  return <section className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 p-3"><h5 className="text-sm font-semibold text-neutral-800">{title}</h5>{result.errors.length ? <p className="mt-1 text-xs font-semibold text-danger-500">{result.errors.join(" ")} Unknown placeholders remain unchanged.</p> : null}<pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-neutral-700">{result.text}</pre></section>;
}

function SectionPermission() {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4"><h3 className="font-semibold text-neutral-900">Notification templates unavailable</h3><p className="mt-1 text-sm text-neutral-600">This section requires notifications.manage permission.</p></div>;
}
