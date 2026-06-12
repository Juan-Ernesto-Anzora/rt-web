export type AuthzProfile = {
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  scopes: string[];
};

type JwtClaims = {
  is_admin?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  staff?: boolean;
  admin?: boolean;
  roles?: unknown;
  role?: unknown;
  groups?: unknown;
  permissions?: unknown;
  permission?: unknown;
  scope?: unknown;
  scp?: unknown;
};

const ADMIN_VALUES = new Set([
  "admin",
  "administrator",
  "staff",
  "superuser",
  "tenant_admin",
  "tenant-admin",
  "configuration_admin",
  "configuration-admin",
]);

const ADMIN_PERMISSIONS = new Set([
  "admin",
  "admin.access",
  "admin.manage",
  "configuration.manage",
  "workflows.manage",
  "users.manage",
  "roles.manage",
]);

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return window.atob(padded);
}

function readJwtClaims(token: string | null): JwtClaims {
  if (!token) return {};
  const [, payload] = token.split(".");
  if (!payload) return {};

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtClaims;
  } catch {
    return {};
  }
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.toLowerCase()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\s]+/).map((item) => item.toLowerCase()).filter(Boolean);
  return [];
}

export function getAuthzProfile(token: string | null): AuthzProfile {
  const claims = readJwtClaims(token);
  const roles = [...normalizeList(claims.roles), ...normalizeList(claims.role), ...normalizeList(claims.groups)];
  const permissions = [...normalizeList(claims.permissions), ...normalizeList(claims.permission)];
  const scopes = [...normalizeList(claims.scope), ...normalizeList(claims.scp)];
  const hasAdminBoolean = Boolean(
    claims.is_admin || claims.is_staff || claims.is_superuser || claims.staff || claims.admin,
  );
  const hasAdminRole = roles.some((role) => ADMIN_VALUES.has(role));
  const hasAdminPermission = [...permissions, ...scopes].some((permission) => ADMIN_PERMISSIONS.has(permission));

  return {
    isAdmin: hasAdminBoolean || hasAdminRole || hasAdminPermission,
    roles,
    permissions,
    scopes,
  };
}

export function canAccessAdmin(profile: AuthzProfile) {
  if (import.meta.env.VITE_ENABLE_ADMIN_DEV_OVERRIDE === "true") return true;
  return profile.isAdmin;
}
