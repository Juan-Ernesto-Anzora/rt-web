import { useCallback, useEffect, useMemo, useState } from "react";
import { configurationApiError, listFeatureFlags, saveFeatureFlag, type FeatureFlag } from "../../../api/adminSettings";
import { ConfirmDialog } from "../../../components/admin/AdminDialog";
import { EmptyState } from "../../../components/common/EmptyState";
import { ErrorState } from "../../../components/common/ErrorState";
import { LoadingRows } from "../../../components/common/LoadingRows";

const FLAG_DEFINITIONS = [
  { key: "adminConsole", label: "Admin console", impact: "administration configuration" },
  { key: "slaEnabled", label: "SLA", impact: "SLA administration and reporting" },
  { key: "exportsEnabled", label: "Exports", impact: "request export configuration" },
  { key: "notificationTemplates", label: "Notification templates", impact: "tenant notification template overrides" },
] as const;

export default function FeatureFlagsPanel({ canManage }: { canManage: boolean }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState<FeatureFlag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const flagsByKey = useMemo(() => new Map(flags.map((flag) => [flag.key, flag])), [flags]);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true); setError(null);
    try { setFlags(await listFeatureFlags()); }
    catch (requestError) { setError(configurationApiError(requestError, "Could not load feature flags.").message); }
    finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => { void load(); }, [load]);

  if (!canManage) return <SectionPermission />;
  if (loading) return <LoadingRows rows={4} />;

  async function update(flag: FeatureFlag, enabled: boolean) {
    setSavingKey(flag.key); setError(null); setNotice(null);
    try {
      await saveFeatureFlag(flag.key, enabled);
      setFlags(await listFeatureFlags());
      setNotice(`${FLAG_DEFINITIONS.find((item) => item.key === flag.key)?.label ?? flag.key} ${enabled ? "enabled" : "disabled"}.`);
      setPendingDisable(null);
    } catch (requestError) { setError(configurationApiError(requestError, "Could not update the feature flag.").message); }
    finally { setSavingKey(null); }
  }

  const missing = FLAG_DEFINITIONS.filter((definition) => !flagsByKey.has(definition.key));
  const pendingDefinition = FLAG_DEFINITIONS.find((item) => item.key === pendingDisable?.key);
  return <section aria-labelledby="feature-flags-title" className="space-y-4">
    <div><h3 id="feature-flags-title" className="text-lg font-semibold text-neutral-900">Feature flags</h3><p className="text-sm text-neutral-600">Tenant feature configuration. Day 8 records state but does not yet enforce existing routes.</p></div>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {notice ? <p role="status" className="rounded-lg border border-accent-500 bg-white p-3 text-sm font-semibold text-neutral-800">{notice}</p> : null}
    {missing.length ? <EmptyState title="Feature flag configuration incomplete" body={`Missing: ${missing.map((item) => item.label).join(", ")}.`} /> : null}
    <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">{FLAG_DEFINITIONS.map((definition) => {
      const flag = flagsByKey.get(definition.key);
      return <div key={definition.key} className="flex min-h-20 flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"><div className="min-w-0"><div className="font-semibold text-neutral-900">{definition.label}</div><div className="text-sm text-neutral-600">{flag?.description || "Description unavailable."}</div><div className="mt-1 text-xs font-semibold text-neutral-600">Key: {definition.key}</div></div><label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-700"><span>{flag?.enabled ? "Enabled" : "Disabled"}</span><input type="checkbox" role="switch" checked={Boolean(flag?.enabled)} disabled={!flag || Boolean(savingKey)} onChange={() => { if (!flag) return; if (flag.enabled) setPendingDisable(flag); else void update(flag, true); }} aria-label={`${definition.label} enabled`} /></label></div>;
    })}</div>
    <ConfirmDialog open={Boolean(pendingDisable)} title={`Disable ${pendingDefinition?.label ?? "feature"}?`} body={`This feature is currently enabled and may be in use for ${pendingDefinition?.impact ?? "tenant operations"}. Day 8 stores this configuration state but does not automatically disable existing routes.`} confirmLabel="Disable feature" busy={Boolean(savingKey)} onClose={() => setPendingDisable(null)} onConfirm={() => { if (pendingDisable) void update(pendingDisable, false); }} />
  </section>;
}

function SectionPermission() {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4"><h3 className="font-semibold text-neutral-900">Feature flags unavailable</h3><p className="mt-1 text-sm text-neutral-600">This section requires featureflags.manage permission.</p></div>;
}
