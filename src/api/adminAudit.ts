import api from "../lib/api";

export type AdminAuditFilters = {
  type?: string;
  actorId?: string;
  requestId?: string;
  entityId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminAuditRecord = {
  activityId: string;
  requestId: string | null;
  actorId: string | null;
  type: string;
  payload: string | null;
  payloadJson: Record<string, unknown> | unknown[] | null;
  entityId: string | null;
  entityType: string | null;
  createdAt: string;
};

export type AdminAuditPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminAuditRecord[];
};

type AuditDto = {
  activity_id?: string;
  request_id?: string | null;
  actor_id?: string | null;
  type?: string;
  payload?: string | null;
  payload_json?: unknown;
  entity_id?: string | null;
  entity_type?: string | null;
  created_at?: string;
};
type PageDto = { count?: number; next?: string | null; previous?: string | null; results?: AuditDto[] };

function dateBoundary(value: string | undefined, end: boolean) {
  if (!value) return undefined;
  return new Date(`${value}${end ? "T23:59:59.999" : "T00:00:00.000"}`).toISOString();
}

function structuredPayload(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function normalizeAudit(item: AuditDto): AdminAuditRecord {
  return {
    activityId: item.activity_id ?? "",
    requestId: item.request_id ?? null,
    actorId: item.actor_id ?? null,
    type: item.type ?? "",
    payload: typeof item.payload === "string" ? item.payload : null,
    payloadJson: structuredPayload(item.payload_json),
    entityId: item.entity_id ?? null,
    entityType: item.entity_type ?? null,
    createdAt: item.created_at ?? "",
  };
}

export async function listAdminAudit(filters: AdminAuditFilters): Promise<AdminAuditPage> {
  const response = await api.get<PageDto>("/admin/audit/", {
    params: {
      type: filters.type?.trim() || undefined,
      actor_id: filters.actorId || undefined,
      request_id: filters.requestId?.trim() || undefined,
      entity_id: filters.entityId?.trim() || undefined,
      created_from: dateBoundary(filters.createdFrom, false),
      created_to: dateBoundary(filters.createdTo, true),
      page: filters.page ?? 1,
      page_size: filters.pageSize ?? 25,
    },
  });
  const results = response.data.results ?? [];
  return {
    count: response.data.count ?? results.length,
    next: response.data.next ?? null,
    previous: response.data.previous ?? null,
    results: results.map(normalizeAudit).filter((item) => item.activityId && item.type && item.createdAt),
  };
}
