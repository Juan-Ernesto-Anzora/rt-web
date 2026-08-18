import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminPermission,
  AdminRole,
  adminApiError,
  assignRolePermission,
  createAdminRole,
  getAdminRole,
  listAllAdminPermissions,
  listAllAdminRoles,
  removeRolePermission,
  updateAdminRole,
} from "../../api/adminDirectory";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { AdminDialog, ConfirmDialog } from "../../components/admin/AdminDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";

const CANONICAL_ROLES = new Set(["RT Admin", "RT Manager", "RT Agent", "RT Requester", "RT Viewer"]);
type ConfirmState = { title: string; body: string; label: string; run(): Promise<void> } | null;

export default function AdminRolesPage() {
  const { token, tenant } = useAuth();
  const { context } = useAdminPermission(token, tenant);
  const permissionCodes = context?.permissions ?? [];
  const canManageRoles = permissionCodes.includes("admin.roles");
  const canManagePermissions = permissionCodes.includes("admin.permissions");
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    if (!canManageRoles) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listAllAdminRoles();
      setRoles(items);
      setSelectedRoleId((current) => current ?? items[0]?.roleId ?? null);
    } catch (requestError) {
      setError(adminApiError(requestError, "Could not load tenant roles."));
    } finally {
      setLoading(false);
    }
  }, [canManageRoles]);

  const loadRoleDetail = useCallback(async (roleId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const role = await getAdminRole(roleId);
      setSelectedRole(role);
    } catch (requestError) {
      setError(adminApiError(requestError, "Could not load role detail."));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    if (!canManagePermissions) return;
    try {
      setPermissions(await listAllAdminPermissions());
    } catch (requestError) {
      setError(adminApiError(requestError, "Could not load the permission catalogue."));
    }
  }, [canManagePermissions]);

  useEffect(() => { void loadRoles(); }, [loadRoles]);
  useEffect(() => { void loadPermissions(); }, [loadPermissions]);
  useEffect(() => { if (selectedRoleId) void loadRoleDetail(selectedRoleId); else setSelectedRole(null); }, [loadRoleDetail, selectedRoleId]);

  const mutate = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNotice(success);
      await loadRoles();
      if (selectedRoleId) await loadRoleDetail(selectedRoleId);
    } catch (requestError) {
      setError(adminApiError(requestError, "The role action could not be completed."));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AdminPermission[]>();
    for (const permission of permissions) {
      const group = permission.code.split(".")[0] || "other";
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [permissions]);

  if (!canManageRoles) {
    return <ErrorState message="The admin.roles permission is required to view and manage tenant roles." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-neutral-900">Roles and permissions</h2><p className="mt-1 text-sm text-neutral-600">Role configuration for tenant {tenant ?? "current"}.</p></div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">Create role</button>
      </div>
      {notice ? <div role="status" className="rounded-lg border border-accent-500 bg-white px-4 py-3 text-sm font-semibold text-neutral-800">{notice}</div> : null}
      {error ? <ErrorState message={error} onRetry={() => void loadRoles()} /> : null}
      {loading ? <LoadingRows rows={5} /> : roles.length === 0 ? <EmptyState title="No tenant roles" body="Create a custom role or apply the canonical role seed for this tenant." /> : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="Tenant roles" className="h-fit rounded-lg border border-neutral-200 bg-white p-2">
            {roles.map((role) => <button key={role.roleId} type="button" onClick={() => setSelectedRoleId(role.roleId)} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${selectedRoleId === role.roleId ? "bg-primary-600 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}><span className="block font-semibold">{role.name}</span><span className={`block truncate text-xs ${selectedRoleId === role.roleId ? "text-primary-50" : "text-neutral-600"}`}>{role.description || "No description"}</span></button>)}
          </nav>
          {detailLoading ? <LoadingRows rows={5} /> : selectedRole ? (
            <RoleDetail
              role={selectedRole}
              groupedPermissions={groupedPermissions}
              canManagePermissions={canManagePermissions}
              busy={busy}
              onSave={(payload) => void mutate(() => updateAdminRole(selectedRole.roleId, payload).then(() => undefined), "Role updated.")}
              onPermission={(permission, assigned) => {
                if (assigned) {
                  if (selectedRole.name === "RT Admin" && permission.code === "admin.read") {
                    setBlockedWarning("Removing admin.read from RT Admin would remove effective admin access for the tenant. Assign and verify another protected admin path before changing this permission.");
                    return;
                  }
                  setConfirm({ title: `Remove ${permission.code}?`, body: `Remove this permission from ${selectedRole.name}? Access may be reduced immediately.`, label: "Remove permission", run: () => mutate(() => removeRolePermission(selectedRole.roleId, permission.code).then(() => undefined), "Permission removed.") });
                } else {
                  void mutate(() => assignRolePermission(selectedRole.roleId, permission.code).then(() => undefined), "Permission assigned.");
                }
              }}
            />
          ) : <EmptyState title="Select a role" body="Choose a role to inspect its details and permissions." />}
        </div>
      )}
      {!canManagePermissions ? <p className="rounded-lg border border-warning-500 bg-white p-3 text-sm text-neutral-800">Permission assignments are read-only because your account does not have admin.permissions.</p> : null}
      <CreateRoleDialog open={createOpen} busy={busy} existingNames={roles.map((role) => role.name.toLowerCase())} onClose={() => setCreateOpen(false)} onCreate={(payload) => void mutate(async () => { const role = await createAdminRole(payload); setSelectedRoleId(role.roleId); setCreateOpen(false); }, "Role created.")} />
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title ?? "Confirm action"} body={confirm?.body ?? ""} confirmLabel={confirm?.label ?? "Confirm"} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => { if (confirm) void confirm.run(); }} />
      <AdminDialog open={Boolean(blockedWarning)} title="Action blocked" description={blockedWarning ?? ""} onClose={() => setBlockedWarning(null)}><div className="flex justify-end"><button type="button" onClick={() => setBlockedWarning(null)} className="btn btn-primary">Close</button></div></AdminDialog>
    </div>
  );
}

function RoleDetail({ role, groupedPermissions, canManagePermissions, busy, onSave, onPermission }: { role: AdminRole; groupedPermissions: Array<[string, AdminPermission[]]>; canManagePermissions: boolean; busy: boolean; onSave(payload: { name: string; description: string | null }): void; onPermission(permission: AdminPermission, assigned: boolean): void }) {
  const canonical = CANONICAL_ROLES.has(role.name);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  useEffect(() => { setName(role.name); setDescription(role.description); }, [role]);
  const assigned = new Set(role.permissions.map((permission) => permission.code));
  return <section className="space-y-4"><form onSubmit={(event) => { event.preventDefault(); onSave({ name: canonical ? role.name : name.trim(), description: description.trim() || null }); }} className="rounded-lg border border-neutral-200 bg-white p-4"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-neutral-700">Role name<input value={name} disabled={canonical} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal disabled:bg-neutral-100" />{canonical ? <span className="mt-1 block text-xs font-normal text-neutral-600">Canonical role names are protected.</span> : null}</label><label className="text-sm font-semibold text-neutral-700">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label></div><button type="submit" disabled={busy || !name.trim()} className="mt-3 btn btn-primary disabled:opacity-60">Save role</button></form><div className="rounded-lg border border-neutral-200 bg-white p-4"><div className="mb-3"><h3 className="font-semibold text-neutral-900">Permission matrix</h3><p className="text-sm text-neutral-600">Permissions assigned to {role.name}.</p></div>{groupedPermissions.length === 0 ? (canManagePermissions ? <EmptyState title="Permission catalogue unavailable" body="No permissions were returned by the API." /> : <div className="flex flex-wrap gap-2">{role.permissions.length ? role.permissions.map((permission) => <span key={permission.code} className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">{permission.code}</span>) : <span className="text-sm text-neutral-600">No permissions assigned</span>}</div>) : <div className="space-y-4">{groupedPermissions.map(([group, items]) => <fieldset key={group}><legend className="mb-2 text-sm font-semibold capitalize text-neutral-900">{group}</legend><div className="grid gap-2 md:grid-cols-2">{items.map((permission) => { const checked = assigned.has(permission.code); return <label key={permission.code} className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 text-sm"><input type="checkbox" checked={checked} disabled={!canManagePermissions || busy} onChange={() => onPermission(permission, checked)} className="mt-1" /><span><span className="block font-semibold text-neutral-800">{permission.code}</span><span className="block text-neutral-600">{permission.description || "No description"}</span></span></label>; })}</div></fieldset>)}</div>}</div></section>;
}

function CreateRoleDialog({ open, busy, existingNames, onClose, onCreate }: { open: boolean; busy: boolean; existingNames: string[]; onClose(): void; onCreate(payload: { name: string; description: string | null }): void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); const normalized = name.trim(); if (!normalized) { setError("Role name is required."); return; } if (existingNames.includes(normalized.toLowerCase())) { setError("A role with this name already exists."); return; } setError(""); onCreate({ name: normalized, description: description.trim() || null }); };
  return <AdminDialog open={open} title="Create tenant role" description="Create a custom role for the active tenant. Canonical RT role names are managed separately." onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-neutral-700">Role name *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="block text-sm font-semibold text-neutral-700">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>{error ? <p className="text-sm font-semibold text-danger-500">{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">{busy ? "Creating..." : "Create role"}</button></div></form></AdminDialog>;
}
