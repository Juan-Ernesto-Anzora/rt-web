import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AdminMembership,
  AdminRole,
  AdminUser,
  adminApiError,
  assignMembershipRole,
  createAdminUser,
  deleteAdminMembership,
  getAdminUser,
  listAdminMemberships,
  listAdminUsers,
  listAllAdminMemberships,
  listAllAdminRoles,
  removeMembershipRole,
  updateAdminMembership,
  updateAdminUser,
} from "../../api/adminDirectory";
import { useAdminPermission } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { AdminDialog, ConfirmDialog } from "../../components/admin/AdminDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";

type ConfirmState = { title: string; body: string; label: string; run(): Promise<void> } | null;

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function userLabel(user: AdminUser) {
  return user.displayName || user.email || "Unnamed RT user";
}

export default function AdminUsersPage() {
  const { token, tenant } = useAuth();
  const { context } = useAdminPermission(token, tenant);
  const permissions = context?.permissions ?? [];
  const canManageUsers = permissions.includes("admin.users");
  const canManageRoles = permissions.includes("admin.roles");
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const activeParam = params.get("active") ?? "all";
  const search = params.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(search);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [allMemberships, setAllMemberships] = useState<AdminMembership[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminUsers({
        page,
        pageSize: 25,
        search,
        isActive: activeParam === "all" ? undefined : activeParam === "active",
      });
      setUsers(result.results);
      setCount(result.count);
      if (selectedUserId && !result.results.some((user) => user.userId === selectedUserId)) {
        setSelectedUserId(null);
      }
    } catch (requestError) {
      setError(adminApiError(requestError, "Could not load Request Tracker users."));
    } finally {
      setLoading(false);
    }
  }, [activeParam, canManageUsers, page, search, selectedUserId]);

  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [user, membershipPage, tenantMemberships, tenantRoles] = await Promise.all([
        getAdminUser(userId),
        listAdminMemberships({ userId, pageSize: 100 }),
        listAllAdminMemberships(),
        canManageRoles ? listAllAdminRoles() : Promise.resolve([]),
      ]);
      setSelectedUser(user);
      setMemberships(membershipPage.results);
      setAllMemberships(tenantMemberships);
      setRoles(tenantRoles);
    } catch (requestError) {
      setDetailError(adminApiError(requestError, "Could not load the RT user detail."));
    } finally {
      setDetailLoading(false);
    }
  }, [canManageRoles]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (selectedUserId) void loadDetail(selectedUserId);
    else {
      setSelectedUser(null);
      setMemberships([]);
    }
  }, [loadDetail, selectedUserId]);

  const refreshDetail = async () => {
    if (selectedUserId) await loadDetail(selectedUserId);
  };

  const runMutation = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setMutationError(null);
    try {
      await action();
      setNotice(success);
      await Promise.all([loadUsers(), refreshDetail()]);
    } catch (requestError) {
      setMutationError(adminApiError(requestError, "The admin action could not be completed."));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const activeAdmins = useMemo(
    () => allMemberships.filter((item) => item.user.isActive && item.roles.some((role) => role.name === "RT Admin")),
    [allMemberships],
  );

  const isFinalAdminMembership = (membership: AdminMembership) =>
    membership.roles.some((role) => role.name === "RT Admin") && activeAdmins.length <= 1;

  if (!canManageUsers) {
    return <ErrorState message="The admin.users permission is required to manage Request Tracker users and memberships." />;
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    const trimmed = searchDraft.trim();
    if (trimmed) next.set("search", trimmed); else next.delete("search");
    next.set("page", "1");
    setParams(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Users and memberships</h2>
          <p className="mt-1 text-sm text-neutral-600">Request Tracker domain users for tenant {tenant ?? "current"}.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">Create RT user</button>
      </div>

      {notice ? <div role="status" className="rounded-lg border border-accent-500 bg-white px-4 py-3 text-sm font-semibold text-neutral-800">{notice}</div> : null}
      {mutationError ? <ErrorState message={mutationError} /> : null}

      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <label className="min-w-64 flex-1 text-sm font-semibold text-neutral-700">
          Search users
          <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Email or display name" className="mt-1 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 font-normal text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600" />
        </label>
        <label className="text-sm font-semibold text-neutral-700">
          Status
          <select value={activeParam} onChange={(event) => {
            const next = new URLSearchParams(params);
            next.set("active", event.target.value);
            next.set("page", "1");
            setParams(next);
          }} className="mt-1 block h-10 rounded-lg border border-neutral-300 bg-white px-3 font-normal">
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
        {search ? <button type="button" onClick={() => { setSearchDraft(""); setParams(activeParam === "all" ? {} : { active: activeParam }); }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700">Clear</button> : null}
      </form>

      {error ? <ErrorState message={error} onRetry={() => void loadUsers()} /> : null}
      {loading ? <LoadingRows rows={6} /> : users.length === 0 && !error ? (
        <EmptyState title="No RT users found" body="Adjust the filters or create a Request Tracker user for this tenant." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Employee code</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => <tr key={user.userId} className="h-12 hover:bg-neutral-50"><td className="px-4"><div className="font-semibold text-neutral-900">{userLabel(user)}</div><div className="text-neutral-600">{user.email}</div></td><td className="px-4 text-neutral-700">{user.employeeCode ?? "-"}</td><td className="px-4"><span className={`rounded px-2 py-1 text-xs font-semibold ${user.isActive ? "bg-primary-50 text-primary-700" : "bg-neutral-100 text-neutral-700"}`}>{user.isActive ? "Active" : "Inactive"}</span></td><td className="px-4 text-neutral-600">{formatDate(user.updatedAt ?? user.createdAt)}</td><td className="px-4 text-right"><button type="button" onClick={() => setSelectedUserId(user.userId)} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-50">Open</button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>{count} users</span>
        <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set("page", String(page - 1)); setParams(next); }} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold disabled:opacity-50">Previous</button><button type="button" disabled={page * 25 >= count} onClick={() => { const next = new URLSearchParams(params); next.set("page", String(page + 1)); setParams(next); }} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold disabled:opacity-50">Next</button></div>
      </div>

      {selectedUserId ? (
        <UserDetail
          user={selectedUser}
          memberships={memberships}
          roles={roles}
          tenantCode={tenant ?? "Current tenant"}
          loading={detailLoading}
          error={detailError}
          busy={busy}
          canManageRoles={canManageRoles}
          isFinalAdminMembership={isFinalAdminMembership}
          onClose={() => setSelectedUserId(null)}
          onSave={(payload) => {
            const membership = memberships[0];
            if (payload.is_active === false && membership && isFinalAdminMembership(membership)) {
              setBlockedWarning("This user is the final active RT Admin. Assign RT Admin to another active membership before deactivating this user.");
              return;
            }
            const action = () => runMutation(() => updateAdminUser(selectedUserId, payload).then(() => undefined), "RT user updated.");
            if (payload.is_active === false) setConfirm({ title: "Deactivate RT user?", body: "The user will no longer be eligible for memberships or role assignments. This does not disable a separate login account.", label: "Deactivate", run: action });
            else void action();
          }}
          onDefault={(membership, value) => void runMutation(() => updateAdminMembership(membership.membershipId, value).then(() => undefined), "Default tenant updated.")}
          onDeleteMembership={(membership) => {
            if (isFinalAdminMembership(membership)) {
              setBlockedWarning("This is the final active RT Admin membership. Assign RT Admin to another active membership before removing it.");
              return;
            }
            setConfirm({ title: "Remove tenant membership?", body: `Remove ${userLabel(membership.user)} from tenant ${tenant ?? "current"}? This does not delete the RT user or a login account.`, label: "Remove membership", run: () => runMutation(() => deleteAdminMembership(membership.membershipId).then(() => undefined), "Membership removed.") });
          }}
          onAssignRole={(membership, roleId) => void runMutation(() => assignMembershipRole(membership.membershipId, roleId).then(() => undefined), "Role assigned.")}
          onRemoveRole={(membership, role) => {
            if (role.name === "RT Admin" && isFinalAdminMembership(membership)) {
              setBlockedWarning("This is the final active RT Admin. Assign RT Admin to another active membership before removing this role.");
              return;
            }
            setConfirm({ title: `Remove ${role.name}?`, body: `Remove this role from ${userLabel(membership.user)} in tenant ${tenant ?? "current"}?`, label: "Remove role", run: () => runMutation(() => removeMembershipRole(membership.membershipId, role.roleId).then(() => undefined), "Role removed.") });
          }}
        />
      ) : null}

      <CreateUserDialog open={createOpen} busy={busy} onClose={() => setCreateOpen(false)} onCreate={(payload) => void runMutation(async () => { const created = await createAdminUser(payload); setSelectedUserId(created.user.userId); setCreateOpen(false); }, "RT user and tenant membership created.")} />
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title ?? "Confirm action"} body={confirm?.body ?? ""} confirmLabel={confirm?.label ?? "Confirm"} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => { if (confirm) void confirm.run(); }} />
      <AdminDialog open={Boolean(blockedWarning)} title="Action blocked" description={blockedWarning ?? ""} onClose={() => setBlockedWarning(null)}><div className="flex justify-end"><button type="button" onClick={() => setBlockedWarning(null)} className="btn btn-primary">Close</button></div></AdminDialog>
    </div>
  );
}

function CreateUserDialog({ open, busy, onClose, onCreate }: { open: boolean; busy: boolean; onClose(): void; onCreate(payload: { email: string; display_name: string; employee_code: string | null; is_default_tenant: boolean }): void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !name.trim()) { setError("Email and display name are required."); return; }
    setError("");
    onCreate({ email: email.trim().toLowerCase(), display_name: name.trim(), employee_code: employeeCode.trim() || null, is_default_tenant: isDefault });
  };
  return <AdminDialog open={open} title="Create Request Tracker user" description="Creates an RT domain user and tenant membership only. It does not create a password, login account, or OIDC identity." onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-neutral-700">Email *<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="block text-sm font-semibold text-neutral-700">Display name *<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="block text-sm font-semibold text-neutral-700">Employee code<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Default tenant for this RT user</label>{error ? <p className="text-sm font-semibold text-danger-500">{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">{busy ? "Creating..." : "Create RT user"}</button></div></form></AdminDialog>;
}

function UserDetail({ user, memberships, roles, tenantCode, loading, error, busy, canManageRoles, isFinalAdminMembership, onClose, onSave, onDefault, onDeleteMembership, onAssignRole, onRemoveRole }: { user: AdminUser | null; memberships: AdminMembership[]; roles: AdminRole[]; tenantCode: string; loading: boolean; error: string | null; busy: boolean; canManageRoles: boolean; isFinalAdminMembership(item: AdminMembership): boolean; onClose(): void; onSave(payload: { display_name?: string; employee_code?: string | null; is_active?: boolean }): void; onDefault(item: AdminMembership, value: boolean): void; onDeleteMembership(item: AdminMembership): void; onAssignRole(item: AdminMembership, roleId: string): void; onRemoveRole(item: AdminMembership, role: { roleId: string; name: string }): void }) {
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [active, setActive] = useState(true);
  const [roleId, setRoleId] = useState("");
  useEffect(() => { if (user) { setName(user.displayName); setEmployeeCode(user.employeeCode ?? ""); setActive(user.isActive); } }, [user]);
  if (loading) return <div className="rounded-lg border border-neutral-200 p-5"><LoadingRows rows={3} /></div>;
  if (error) return <ErrorState message={error} />;
  if (!user) return null;
  const membership = memberships[0];
  const availableRoles = membership ? roles.filter((role) => !membership.roles.some((assigned) => assigned.roleId === role.roleId)) : [];
  return <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-neutral-900">{userLabel(user)}</h3><p className="text-sm text-neutral-600">{user.email}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Close</button></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><form onSubmit={(event) => { event.preventDefault(); const payload: { display_name?: string; employee_code?: string | null; is_active?: boolean } = {}; if (name.trim() !== user.displayName) payload.display_name = name.trim(); if ((employeeCode.trim() || null) !== user.employeeCode) payload.employee_code = employeeCode.trim() || null; if (active !== user.isActive) payload.is_active = active; if (Object.keys(payload).length) onSave(payload); }} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"><h4 className="font-semibold text-neutral-900">RT user details</h4><p className="text-xs text-neutral-600">This profile is separate from any login account or identity provider record.</p><label className="block text-sm font-semibold text-neutral-700">Display name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="block text-sm font-semibold text-neutral-700">Employee code<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal" /></label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active RT user</label><button type="submit" disabled={busy || !name.trim()} className="btn btn-primary disabled:opacity-60">Save changes</button></form><div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"><h4 className="font-semibold text-neutral-900">Tenant membership</h4>{!membership ? <EmptyState title="No membership" body="No current-tenant membership was returned by the API." /> : <><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><div className="font-semibold text-neutral-900">{tenantCode}</div><div className="text-neutral-600">{membership.isDefaultTenant ? "Default tenant" : "Tenant member"}</div></div><label className="flex items-center gap-2 text-neutral-700"><input type="checkbox" checked={membership.isDefaultTenant} disabled={busy} onChange={(event) => onDefault(membership, event.target.checked)} /> Default tenant</label></div><div><div className="mb-2 text-sm font-semibold text-neutral-700">Roles</div><div className="flex flex-wrap gap-2">{membership.roles.length ? membership.roles.map((role) => <span key={role.roleId} className="inline-flex items-center gap-2 rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">{role.name}{canManageRoles ? <button type="button" disabled={busy} onClick={() => onRemoveRole(membership, role)} aria-label={`Remove ${role.name}`} className="text-danger-500">Remove</button> : null}</span>) : <span className="text-sm text-neutral-600">No roles assigned</span>}</div></div>{canManageRoles && availableRoles.length ? <div className="flex gap-2"><select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">Select role</option>{availableRoles.map((role) => <option key={role.roleId} value={role.roleId}>{role.name}</option>)}</select><button type="button" disabled={busy || !roleId} onClick={() => { if (roleId) { onAssignRole(membership, roleId); setRoleId(""); } }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Assign</button></div> : null}{isFinalAdminMembership(membership) ? <p className="rounded-lg border border-warning-500 p-3 text-sm font-semibold text-neutral-800">Final RT Admin safeguards are active for this membership.</p> : null}<button type="button" disabled={busy} onClick={() => onDeleteMembership(membership)} className="rounded-lg border border-danger-500 px-3 py-2 text-sm font-semibold text-danger-500 disabled:opacity-60">Remove membership</button></>}</div></div></section>;
}
