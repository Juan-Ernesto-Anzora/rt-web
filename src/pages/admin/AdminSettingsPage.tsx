import { useCallback, useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { ConfirmDialog } from "../../components/admin/AdminDialog";
import { LoadingRows } from "../../components/common/LoadingRows";
import FeatureFlagsPanel from "./settings/FeatureFlagsPanel";
import GeneralSettingsPanel from "./settings/GeneralSettingsPanel";
import NotificationTemplatesPanel from "./settings/NotificationTemplatesPanel";

export default function AdminSettingsPage() {
  const { token, tenant } = useAuth();
  const { context, loading } = useAdminPermission(token, tenant);
  const permissions = context?.permissions ?? [];
  const canReadGeneral = permissions.includes("admin.settings");
  const canWriteGeneral = canReadGeneral && permissions.includes("tenant.settings.manage");
  const canManageFlags = permissions.includes("featureflags.manage");
  const canManageTemplates = permissions.includes("notifications.manage");
  const [generalDirty, setGeneralDirty] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false);
  const dirty = generalDirty || templateDirty;
  const blocker = useBlocker(dirty);
  const onGeneralDirty = useCallback((value: boolean) => setGeneralDirty(value), []);
  const onTemplateDirty = useCallback((value: boolean) => setTemplateDirty(value), []);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (loading) return <LoadingRows rows={6} />;

  const hasAnyPermission = canReadGeneral || canManageFlags || canManageTemplates;
  return <div className="space-y-6">
    <header><h2 className="text-xl font-semibold text-neutral-900">Settings</h2><p className="text-sm text-neutral-600">Tenant configuration, feature state, and notification content.</p></header>
    {!hasAnyPermission ? <div className="rounded-lg border border-danger-500 bg-white p-4"><h3 className="font-semibold text-danger-500">Settings access denied</h3><p className="mt-1 text-sm text-neutral-700">Your account does not have permission to open any settings section for this tenant.</p></div> : null}
    <GeneralSettingsPanel key={`${tenant}-general`} canRead={canReadGeneral} canWrite={canWriteGeneral} onDirtyChange={onGeneralDirty} />
    <FeatureFlagsPanel key={`${tenant}-flags`} canManage={canManageFlags} />
    <NotificationTemplatesPanel key={`${tenant}-templates`} canManage={canManageTemplates} onDirtyChange={onTemplateDirty} />
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave with unsaved changes?" body="Unsaved tenant settings or notification template changes will be discarded." confirmLabel="Leave page" busy={false} onClose={() => blocker.reset?.()} onConfirm={() => blocker.proceed?.()} />
  </div>;
}
