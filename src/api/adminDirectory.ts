import axios from "axios";
import api from "../lib/api";

export type AdminUser = {
  userId: string;
  email: string;
  displayName: string;
  employeeCode: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type AdminRoleSummary = { roleId: string; name: string };
export type AdminPermission = { code: string; description: string };

export type AdminMembership = {
  membershipId: string;
  tenantId: string;
  user: AdminUser;
  isDefaultTenant: boolean;
  roles: AdminRoleSummary[];
  createdAt: string;
};

export type AdminRole = {
  roleId: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  createdAt: string;
};

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type AdminUserWrite = {
  email: string;
  display_name: string;
  employee_code?: string | null;
  is_default_tenant?: boolean;
};

export type AdminUserUpdate = {
  display_name?: string;
  employee_code?: string | null;
  is_active?: boolean;
};

export type AdminRoleWrite = { name: string; description?: string | null };

type UserDto = {
  user_id?: string;
  email?: string;
  display_name?: string;
  employee_code?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type RoleSummaryDto = { role_id?: string; name?: string };
type PermissionDto = { code?: string; description?: string | null };
type MembershipDto = {
  membership_id?: string;
  tenant_id?: string;
  user?: UserDto;
  is_default_tenant?: boolean;
  roles?: RoleSummaryDto[];
  created_at?: string;
};
type RoleDto = {
  role_id?: string;
  tenant_id?: string;
  name?: string;
  description?: string | null;
  permissions?: PermissionDto[];
  created_at?: string;
};
type PageDto<T> = { count?: number; next?: string | null; previous?: string | null; results?: T[] };
type UserCreateResponseDto = { user?: UserDto; membership?: MembershipDto };

function normalizeUser(user: UserDto): AdminUser {
  return {
    userId: user.user_id ?? "",
    email: user.email ?? "",
    displayName: user.display_name ?? user.email ?? "Unnamed RT user",
    employeeCode: user.employee_code?.trim() || null,
    avatarUrl: user.avatar_url?.trim() || null,
    isActive: user.is_active !== false,
    createdAt: user.created_at ?? "",
    updatedAt: user.updated_at ?? null,
  };
}

function normalizeRoleSummary(role: RoleSummaryDto): AdminRoleSummary {
  return { roleId: role.role_id ?? "", name: role.name ?? "Unnamed role" };
}

function normalizePermission(permission: PermissionDto): AdminPermission {
  return { code: permission.code ?? "", description: permission.description ?? "" };
}

function normalizeMembership(membership: MembershipDto): AdminMembership {
  return {
    membershipId: membership.membership_id ?? "",
    tenantId: membership.tenant_id ?? "",
    user: normalizeUser(membership.user ?? {}),
    isDefaultTenant: Boolean(membership.is_default_tenant),
    roles: (membership.roles ?? []).map(normalizeRoleSummary).filter((role) => role.roleId),
    createdAt: membership.created_at ?? "",
  };
}

function normalizeRole(role: RoleDto): AdminRole {
  return {
    roleId: role.role_id ?? "",
    tenantId: role.tenant_id ?? "",
    name: role.name ?? "Unnamed role",
    description: role.description ?? "",
    permissions: (role.permissions ?? []).map(normalizePermission).filter((permission) => permission.code),
    createdAt: role.created_at ?? "",
  };
}

function normalizePage<TDto, T>(data: PageDto<TDto> | TDto[], normalize: (item: TDto) => T): Page<T> {
  const results = Array.isArray(data) ? data : data.results ?? [];
  return {
    count: Array.isArray(data) ? data.length : data.count ?? results.length,
    next: Array.isArray(data) ? null : data.next ?? null,
    previous: Array.isArray(data) ? null : data.previous ?? null,
    results: results.map(normalize),
  };
}

async function collectPages<T>(load: (page: number) => Promise<Page<T>>) {
  const all: T[] = [];
  let pageNumber = 1;
  while (pageNumber <= 100) {
    const page = await load(pageNumber);
    all.push(...page.results);
    if (!page.next) break;
    pageNumber += 1;
  }
  return all;
}

export function adminApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return fallback;
  if ("message" in data && typeof data.message === "string") return data.message;
  if ("details" in data && Array.isArray(data.details)) {
    const messages = data.details.flatMap((detail: unknown) => {
      if (!detail || typeof detail !== "object") return [];
      const field = "field" in detail ? String(detail.field).replace(/_/g, " ") : "";
      const message = "message" in detail ? String(detail.message) : "";
      return message ? [`${field ? `${field}: ` : ""}${message}`] : [];
    });
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

export function adminApiCode(error: unknown) {
  if (!axios.isAxiosError(error) || !error.response?.data || typeof error.response.data !== "object") return "";
  return "code" in error.response.data ? String(error.response.data.code) : "";
}

export async function listAdminUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  sort?: string;
} = {}) {
  const response = await api.get<PageDto<UserDto> | UserDto[]>("/admin/users/", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 25,
      sort: params.sort ?? "display_name",
      search: params.search || undefined,
      is_active: params.isActive,
    },
  });
  return normalizePage(response.data, normalizeUser);
}

export async function getAdminUser(userId: string) {
  const response = await api.get<UserDto>(`/admin/users/${encodeURIComponent(userId)}/`);
  return normalizeUser(response.data);
}

export async function createAdminUser(payload: AdminUserWrite) {
  const response = await api.post<UserCreateResponseDto>("/admin/users/", payload);
  return {
    user: normalizeUser(response.data.user ?? {}),
    membership: normalizeMembership(response.data.membership ?? {}),
  };
}

export async function updateAdminUser(userId: string, payload: AdminUserUpdate) {
  const response = await api.patch<UserDto>(`/admin/users/${encodeURIComponent(userId)}/`, payload);
  return normalizeUser(response.data);
}

export async function listAdminMemberships(params: { page?: number; pageSize?: number; userId?: string } = {}) {
  const response = await api.get<PageDto<MembershipDto> | MembershipDto[]>("/admin/memberships/", {
    params: { page: params.page ?? 1, page_size: params.pageSize ?? 25, user_id: params.userId || undefined },
  });
  return normalizePage(response.data, normalizeMembership);
}

export function listAllAdminMemberships() {
  return collectPages((page) => listAdminMemberships({ page, pageSize: 100 }));
}

export async function updateAdminMembership(membershipId: string, isDefaultTenant: boolean) {
  const response = await api.patch<MembershipDto>(`/admin/memberships/${encodeURIComponent(membershipId)}/`, {
    is_default_tenant: isDefaultTenant,
  });
  return normalizeMembership(response.data);
}

export function deleteAdminMembership(membershipId: string) {
  return api.delete(`/admin/memberships/${encodeURIComponent(membershipId)}/`);
}

export async function listAdminRoles(params: { page?: number; pageSize?: number } = {}) {
  const response = await api.get<PageDto<RoleDto> | RoleDto[]>("/admin/roles/", {
    params: { page: params.page ?? 1, page_size: params.pageSize ?? 100, sort: "name" },
  });
  return normalizePage(response.data, normalizeRole);
}

export function listAllAdminRoles() {
  return collectPages((page) => listAdminRoles({ page, pageSize: 100 }));
}

export async function getAdminRole(roleId: string) {
  const response = await api.get<RoleDto>(`/admin/roles/${encodeURIComponent(roleId)}/`);
  return normalizeRole(response.data);
}

export async function createAdminRole(payload: AdminRoleWrite) {
  const response = await api.post<RoleDto>("/admin/roles/", payload);
  return normalizeRole(response.data);
}

export async function updateAdminRole(roleId: string, payload: AdminRoleWrite) {
  const response = await api.patch<RoleDto>(`/admin/roles/${encodeURIComponent(roleId)}/`, payload);
  return normalizeRole(response.data);
}

export async function listAllAdminPermissions() {
  return collectPages(async (page) => {
    const response = await api.get<PageDto<PermissionDto> | PermissionDto[]>("/admin/permissions/", {
      params: { page, page_size: 100 },
    });
    return normalizePage(response.data, normalizePermission);
  });
}

export async function assignMembershipRole(membershipId: string, roleId: string) {
  const response = await api.post<MembershipDto>(
    `/admin/memberships/${encodeURIComponent(membershipId)}/roles/`,
    { role_id: roleId },
  );
  return normalizeMembership(response.data);
}

export function removeMembershipRole(membershipId: string, roleId: string) {
  return api.delete(
    `/admin/memberships/${encodeURIComponent(membershipId)}/roles/${encodeURIComponent(roleId)}/`,
  );
}

export async function assignRolePermission(roleId: string, permissionCode: string) {
  const response = await api.post<RoleDto>(`/admin/roles/${encodeURIComponent(roleId)}/permissions/`, {
    permission_code: permissionCode,
  });
  return normalizeRole(response.data);
}

export function removeRolePermission(roleId: string, permissionCode: string) {
  return api.delete(
    `/admin/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionCode)}/`,
  );
}
