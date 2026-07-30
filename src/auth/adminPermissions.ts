import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/api";
import { hasAdminDevOverride } from "./permissions";

export type AdminPermissionContext = {
  isAdmin: boolean;
  canReadAudit: boolean;
  roles: string[];
  permissions: string[];
};

type AdminPermissionsDto = {
  is_admin?: boolean;
  can_read_audit?: boolean;
  roles?: unknown;
  permissions?: unknown;
};

type AdminPermissionState = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
  context: AdminPermissionContext | null;
};

const ADMIN_ACCESS_PERMISSIONS = new Set([
  "admin",
  "admin.access",
  "admin.read",
  "admin.manage",
  "admin.workflows",
  "admin.audit.read",
  "configuration.manage",
  "workflows.manage",
  "users.manage",
  "roles.manage",
]);

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.toLowerCase()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\s]+/).map((item) => item.toLowerCase()).filter(Boolean);
  return [];
}

function normalizeAdminPermissions(data: AdminPermissionsDto): AdminPermissionContext {
  const roles = normalizeList(data.roles);
  const permissions = normalizeList(data.permissions);
  return {
    isAdmin: Boolean(data.is_admin) || permissions.some((permission) => ADMIN_ACCESS_PERMISSIONS.has(permission)),
    canReadAudit: Boolean(data.can_read_audit) || permissions.includes("admin.audit.read"),
    roles,
    permissions,
  };
}

export function hasAdminAccess(context: AdminPermissionContext | null) {
  return Boolean(context?.isAdmin || context?.permissions.some((permission) => ADMIN_ACCESS_PERMISSIONS.has(permission)));
}

export async function getAdminPermissionContext() {
  const response = await api.get<AdminPermissionsDto>("/admin/me/permissions/");
  return normalizeAdminPermissions(response.data);
}

export function useAdminPermission(token: string | null, tenant: string | null): AdminPermissionState {
  const [state, setState] = useState<AdminPermissionState>({
    loading: Boolean(token && tenant),
    allowed: false,
    error: null,
    context: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!token || !tenant) {
      setState({ loading: false, allowed: false, error: null, context: null });
      return () => {
        cancelled = true;
      };
    }

    async function loadPermissions() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const context = await getAdminPermissionContext();
        if (cancelled) return;
        setState({
          loading: false,
          allowed: hasAdminAccess(context),
          error: null,
          context,
        });
      } catch (error) {
        if (cancelled) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const overrideAllowed = hasAdminDevOverride();
        setState({
          loading: false,
          allowed: overrideAllowed,
          error: status === 403 || overrideAllowed ? null : "Could not verify admin permissions.",
          context: null,
        });
      }
    }

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [token, tenant]);

  return state;
}
