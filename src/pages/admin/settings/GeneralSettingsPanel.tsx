import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  configurationApiError,
  listTenantSettings,
  saveTenantSettings,
  type SettingUpdate,
  type SettingValueType,
  type TenantSetting,
} from "../../../api/adminSettings";
import { EmptyState } from "../../../components/common/EmptyState";
import { ErrorState } from "../../../components/common/ErrorState";
import { LoadingRows } from "../../../components/common/LoadingRows";

type GeneralKey = "web_base_url" | "default_timezone" | "default_page_size" | "email_from";
type FieldErrors = Partial<Record<GeneralKey, string>>;

const DEFINITIONS: Array<{
  key: GeneralKey;
  label: string;
  type: "url" | "text" | "number" | "email";
  valueType: SettingValueType;
  help: string;
}> = [
  { key: "web_base_url", label: "Web base URL", type: "url", valueType: "url", help: "Base address used to build request links in notification emails." },
  { key: "default_timezone", label: "Default timezone", type: "text", valueType: "timezone", help: "IANA timezone for tenant clients, for example America/El_Salvador." },
  { key: "default_page_size", label: "Default page size", type: "number", valueType: "integer", help: "Preferred tenant client page size from 1 to 100." },
  { key: "email_from", label: "Email from", type: "email", valueType: "email", help: "Sender address used for tenant notification emails." },
];

function normalizeValue(key: GeneralKey, value: string) {
  const trimmed = value.trim();
  if (key === "web_base_url") return trimmed.replace(/\/+(?=\?|$)/, "");
  if (key === "default_page_size") return String(Number.parseInt(trimmed, 10));
  return trimmed;
}

function validate(values: Record<GeneralKey, string>, settings: Map<string, TenantSetting>) {
  const errors: FieldErrors = {};
  for (const definition of DEFINITIONS) {
    const setting = settings.get(definition.key);
    if (!setting || setting.isSensitive) continue;
    const value = values[definition.key].trim();
    if (!value) { errors[definition.key] = "A value is required."; continue; }
    if (definition.key === "web_base_url") {
      try {
        const parsed = new URL(value);
        if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.hash) {
          errors[definition.key] = "Enter an absolute HTTP or HTTPS URL without credentials or a fragment.";
        }
      } catch { errors[definition.key] = "Enter a valid absolute URL."; }
    }
    if (definition.key === "default_timezone") {
      try { new Intl.DateTimeFormat(undefined, { timeZone: value }).format(); }
      catch { errors[definition.key] = "Enter a valid IANA timezone."; }
    }
    if (definition.key === "default_page_size") {
      const number = Number(value);
      if (!Number.isInteger(number) || number < 1 || number > 100) errors[definition.key] = "Enter a whole number from 1 to 100.";
    }
    if (definition.key === "email_from" && !/^[^\s@]+@[^\s@]+$/.test(value)) errors[definition.key] = "Enter a valid email address.";
  }
  return errors;
}

function valuesFrom(settings: TenantSetting[]) {
  const values = { web_base_url: "", default_timezone: "", default_page_size: "", email_from: "" };
  for (const definition of DEFINITIONS) {
    const setting = settings.find((item) => item.key === definition.key);
    values[definition.key] = setting?.isSensitive ? "" : setting?.value ?? "";
  }
  return values;
}

export default function GeneralSettingsPanel({ canRead, canWrite, onDirtyChange }: { canRead: boolean; canWrite: boolean; onDirtyChange(dirty: boolean): void }) {
  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [draft, setDraft] = useState<Record<GeneralKey, string>>(() => valuesFrom([]));
  const [loading, setLoading] = useState(canRead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const settingsByKey = useMemo(() => new Map(settings.map((item) => [item.key, item])), [settings]);
  const snapshot = useMemo(() => valuesFrom(settings), [settings]);
  const dirty = useMemo(() => DEFINITIONS.some(({ key }) => draft[key] !== snapshot[key]), [draft, snapshot]);

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    try {
      const next = await listTenantSettings();
      setSettings(next); setDraft(valuesFrom(next)); setFieldErrors({});
    } catch (requestError) {
      setError(configurationApiError(requestError, "Could not load general settings.").message);
    } finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);

  if (!canRead) return <SectionPermission message="General settings require admin.settings permission." />;
  if (loading) return <LoadingRows rows={4} />;

  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null); setError(null);
    const nextErrors = validate(draft, settingsByKey);
    for (const definition of DEFINITIONS) {
      const setting = settingsByKey.get(definition.key);
      if (setting && setting.valueType !== definition.valueType) nextErrors[definition.key] = `Expected API type ${definition.valueType}.`;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length || !canWrite) return;
    const payload: SettingUpdate[] = DEFINITIONS.flatMap((definition) => {
      const setting = settingsByKey.get(definition.key);
      if (!setting || setting.isSensitive) return [];
      const value = normalizeValue(definition.key, draft[definition.key]);
      return value === setting.value ? [] : [{ key: definition.key, value, value_type: setting.valueType }];
    });
    if (!payload.length) return;
    setSaving(true);
    try {
      await saveTenantSettings(payload);
      const refreshed = await listTenantSettings();
      setSettings(refreshed); setDraft(valuesFrom(refreshed)); setNotice("General settings saved.");
    } catch (requestError) {
      const parsed = configurationApiError(requestError, "Could not save general settings.");
      const mapped: FieldErrors = {};
      for (const detail of parsed.details) {
        const indexed = detail.field.match(/^settings\.(\d+)\./);
        const key = indexed ? payload[Number(indexed[1])]?.key : detail.field;
        if (DEFINITIONS.some((item) => item.key === key)) mapped[key as GeneralKey] = detail.message;
      }
      setFieldErrors(mapped); setError(parsed.message);
    } finally { setSaving(false); }
  }

  const missing = DEFINITIONS.filter(({ key }) => !settingsByKey.has(key));
  return <section aria-labelledby="general-settings-title" className="space-y-4">
    <div><h3 id="general-settings-title" className="text-lg font-semibold text-neutral-900">General settings</h3><p className="text-sm text-neutral-600">Tenant defaults and notification delivery identity.</p></div>
    {!canWrite ? <p className="rounded-lg border border-warning-500 bg-white p-3 text-sm text-neutral-800">Read-only. Saving requires tenant.settings.manage permission.</p> : null}
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {notice ? <p role="status" className="rounded-lg border border-accent-500 bg-white p-3 text-sm font-semibold text-neutral-800">{notice}</p> : null}
    {missing.length ? <EmptyState title="Settings configuration incomplete" body={`Missing: ${missing.map((item) => item.label).join(", ")}.`} /> : null}
    <form onSubmit={submit} className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">{DEFINITIONS.map((definition) => {
        const setting = settingsByKey.get(definition.key);
        const sensitive = setting?.isSensitive;
        const inputId = `setting-${definition.key}`;
        return <label key={definition.key} htmlFor={inputId} className="text-sm font-semibold text-neutral-700">{definition.label}
          {sensitive ? <span id={inputId} className="mt-1 block h-10 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-normal text-neutral-700">{setting.hasValue ? "Configured" : "Not configured"}</span> : <input id={inputId} type={definition.type} min={definition.type === "number" ? 1 : undefined} max={definition.type === "number" ? 100 : undefined} step={definition.type === "number" ? 1 : undefined} value={draft[definition.key]} disabled={!setting || !canWrite || saving} onChange={(event) => { setDraft((current) => ({ ...current, [definition.key]: event.target.value })); setFieldErrors((current) => ({ ...current, [definition.key]: undefined })); setNotice(null); }} aria-invalid={Boolean(fieldErrors[definition.key])} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal disabled:bg-neutral-100" />}
          <span className="mt-1 block text-xs font-normal text-neutral-600">{definition.help}</span>{fieldErrors[definition.key] ? <span className="mt-1 block text-xs font-semibold text-danger-500">{fieldErrors[definition.key]}</span> : null}
        </label>;
      })}</div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3"><button type="button" disabled={!dirty || saving} onClick={() => { setDraft(snapshot); setFieldErrors({}); setNotice(null); }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Cancel edits</button><button type="button" disabled={saving} onClick={() => void load()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Reset from server</button><button type="submit" disabled={!dirty || !canWrite || saving} className="btn btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save settings"}</button></div>
    </form>
  </section>;
}

function SectionPermission({ message }: { message: string }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4"><h3 className="font-semibold text-neutral-900">General settings unavailable</h3><p className="mt-1 text-sm text-neutral-600">{message}</p></div>;
}
