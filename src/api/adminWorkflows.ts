import axios from "axios";
import api from "../lib/api";

export type AdminWorkflow = {
  flowId: string;
  name: string;
  description: string;
  createdAt?: string;
};

export type AdminStatus = {
  statusId: string;
  flowId: string;
  name: string;
  category: string;
  isTerminal: boolean;
  createdAt?: string;
};

export type AdminTransition = {
  transitionId: string;
  flowId: string;
  fromStatusId: string;
  toStatusId: string;
  guardRolesJson: string | null;
  guardPermsJson: string | null;
  autoRules: string | null;
  createdAt?: string;
};

export type AdminWorkflowDetail = AdminWorkflow & {
  statuses: AdminStatus[];
  transitions: AdminTransition[];
};

export type StatusWritePayload = {
  name: string;
  category: string;
  is_terminal: boolean;
};

export type TransitionWritePayload = {
  from_status_id: string;
  to_status_id: string;
  guard_roles_json?: string | null;
  guard_perms_json?: string | null;
  auto_rules?: string | null;
};

type WorkflowDto = {
  flow_id?: string;
  name?: string;
  description?: string | null;
  created_at?: string;
};

type StatusDto = {
  status_id?: string;
  flow_id?: string;
  name?: string;
  category?: string;
  is_terminal?: boolean;
  created_at?: string;
};

type TransitionDto = {
  transition_id?: string;
  flow_id?: string;
  from_status_id?: string;
  to_status_id?: string;
  guard_roles_json?: string | null;
  guard_perms_json?: string | null;
  auto_rules?: string | null;
  created_at?: string;
};

type WorkflowDetailDto = WorkflowDto & {
  statuses?: StatusDto[];
  transitions?: TransitionDto[];
};

type Paginated<T> = {
  results?: T[];
};

function asArray<T>(value: T[] | Paginated<T>) {
  return Array.isArray(value) ? value : value.results ?? [];
}

function normalizeWorkflow(workflow: WorkflowDto): AdminWorkflow {
  return {
    flowId: workflow.flow_id ?? "",
    name: workflow.name ?? "Untitled workflow",
    description: workflow.description ?? "",
    createdAt: workflow.created_at,
  };
}

function normalizeStatus(status: StatusDto): AdminStatus {
  return {
    statusId: status.status_id ?? "",
    flowId: status.flow_id ?? "",
    name: status.name ?? "Untitled status",
    category: status.category ?? "",
    isTerminal: Boolean(status.is_terminal),
    createdAt: status.created_at,
  };
}

function normalizeTransition(transition: TransitionDto): AdminTransition {
  return {
    transitionId: transition.transition_id ?? "",
    flowId: transition.flow_id ?? "",
    fromStatusId: transition.from_status_id ?? "",
    toStatusId: transition.to_status_id ?? "",
    guardRolesJson: transition.guard_roles_json ?? null,
    guardPermsJson: transition.guard_perms_json ?? null,
    autoRules: transition.auto_rules ?? null,
    createdAt: transition.created_at,
  };
}

function normalizeWorkflowDetail(workflow: WorkflowDetailDto): AdminWorkflowDetail {
  return {
    ...normalizeWorkflow(workflow),
    statuses: (workflow.statuses ?? []).map(normalizeStatus).filter((status) => status.statusId),
    transitions: (workflow.transitions ?? [])
      .map(normalizeTransition)
      .filter((transition) => transition.transitionId),
  };
}

export function readableApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return fallback;
  if ("message" in data && typeof data.message === "string") return data.message;
  if ("details" in data && Array.isArray(data.details)) {
    const details = data.details
      .map((detail: unknown) => {
        if (!detail || typeof detail !== "object") return "";
        const field = "field" in detail ? String(detail.field) : "";
        const message = "message" in detail ? String(detail.message) : "";
        return field && message ? `${field}: ${message}` : message;
      })
      .filter(Boolean);
    if (details.length) return details.join(" ");
  }
  const firstEntry = Object.entries(data).find(([, value]) => Array.isArray(value) || typeof value === "string");
  if (!firstEntry) return fallback;
  const [field, value] = firstEntry;
  const message = Array.isArray(value) ? value.join(" ") : String(value);
  return `${field}: ${message}`;
}

export async function listAdminWorkflows() {
  const response = await api.get<WorkflowDto[] | Paginated<WorkflowDto>>("/admin/workflows/");
  return asArray(response.data).map(normalizeWorkflow).filter((workflow) => workflow.flowId);
}

export async function getAdminWorkflow(flowId: string) {
  const response = await api.get<WorkflowDetailDto>(`/admin/workflows/${encodeURIComponent(flowId)}/`);
  return normalizeWorkflowDetail(response.data);
}

export async function createAdminStatus(flowId: string, payload: StatusWritePayload) {
  const response = await api.post<StatusDto>(`/admin/workflows/${encodeURIComponent(flowId)}/statuses/`, payload);
  return normalizeStatus(response.data);
}

export async function updateAdminStatus(flowId: string, statusId: string, payload: StatusWritePayload) {
  const response = await api.patch<StatusDto>(
    `/admin/workflows/${encodeURIComponent(flowId)}/statuses/${encodeURIComponent(statusId)}/`,
    payload,
  );
  return normalizeStatus(response.data);
}

export async function createAdminTransition(flowId: string, payload: TransitionWritePayload) {
  const response = await api.post<TransitionDto>(`/admin/workflows/${encodeURIComponent(flowId)}/transitions/`, payload);
  return normalizeTransition(response.data);
}

export async function updateAdminTransition(flowId: string, transitionId: string, payload: TransitionWritePayload) {
  const response = await api.patch<TransitionDto>(
    `/admin/workflows/${encodeURIComponent(flowId)}/transitions/${encodeURIComponent(transitionId)}/`,
    payload,
  );
  return normalizeTransition(response.data);
}
