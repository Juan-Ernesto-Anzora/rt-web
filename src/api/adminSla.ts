import axios from "axios";
import api from "../lib/api";
import type { Page } from "./adminDirectory";

export type SlaPriority = "low" | "normal" | "high" | "urgent";

export type SlaPolicy = {
  id: string;
  name: string;
  priority: SlaPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type SlaPolicyWrite = {
  name: string;
  priority: SlaPriority;
  response_minutes: number;
  resolution_minutes: number;
  is_active: boolean;
};

export type SlaFieldErrors = Partial<Record<keyof SlaPolicyWrite, string>>;

type SlaPolicyDto = {
  sla_policy_id: string;
  name: string;
  priority: SlaPriority;
  response_minutes: number;
  resolution_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};
type PageDto<T> = { count?: number; next?: string | null; previous?: string | null; results?: T[] };

function normalizePolicy(item: SlaPolicyDto): SlaPolicy {
  return {
    id: item.sla_policy_id,
    name: item.name,
    priority: item.priority,
    responseMinutes: item.response_minutes,
    resolutionMinutes: item.resolution_minutes,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function normalizePage(data: PageDto<SlaPolicyDto> | SlaPolicyDto[]): Page<SlaPolicy> {
  const results = Array.isArray(data) ? data : data.results ?? [];
  return {
    count: Array.isArray(data) ? data.length : data.count ?? results.length,
    next: Array.isArray(data) ? null : data.next ?? null,
    previous: Array.isArray(data) ? null : data.previous ?? null,
    results: results.map(normalizePolicy),
  };
}

export async function listSlaPolicies(params: {
  page?: number;
  search?: string;
  priority?: string;
  isActive?: string;
} = {}) {
  const response = await api.get<PageDto<SlaPolicyDto> | SlaPolicyDto[]>("/admin/sla-policies/", {
    params: {
      page: params.page ?? 1,
      page_size: 25,
      search: params.search?.trim() || undefined,
      priority: params.priority || undefined,
      is_active: params.isActive || undefined,
    },
  });
  return normalizePage(response.data);
}

export async function createSlaPolicy(payload: SlaPolicyWrite) {
  const response = await api.post<SlaPolicyDto>("/admin/sla-policies/", payload);
  return normalizePolicy(response.data);
}

export async function updateSlaPolicy(id: string, payload: Partial<SlaPolicyWrite>) {
  const response = await api.patch<SlaPolicyDto>(`/admin/sla-policies/${encodeURIComponent(id)}/`, payload);
  return normalizePolicy(response.data);
}

export function slaApiError(error: unknown) {
  const fallback = { message: "Could not save the SLA policy.", fields: {} as SlaFieldErrors };
  if (!axios.isAxiosError(error) || !error.response?.data || typeof error.response.data !== "object") return fallback;
  const data = error.response.data as { message?: string; details?: Array<{ field?: string; message?: string }> };
  const fields: SlaFieldErrors = {};
  for (const detail of data.details ?? []) {
    if (detail.field && detail.message && detail.field in { name: 1, priority: 1, response_minutes: 1, resolution_minutes: 1, is_active: 1 }) {
      fields[detail.field as keyof SlaPolicyWrite] = detail.message;
    }
  }
  return {
    message: error.response.status === 403 ? "You do not have sla.manage permission for this tenant." : data.message ?? fallback.message,
    fields,
  };
}
