import api from "../lib/api";

export type CreateRequestPayload = {
  title: string;
  description: string;
  flow_id: string;
  status_id: string;
  priority?: string;
  requester_id: string;
  assignee_id?: string | null;
  tags?: string[];
  due_at?: string;
};

export type CreateRequestResult = {
  requestId: string;
  title: string;
};

type CreateRequestDto = {
  requestid?: string;
  humanid?: string;
  request_id?: string;
  human_id?: string;
  title?: string;
};

type StatusDto = {
  id?: string;
  status_id?: string;
  statusid?: string;
  name?: string;
  label?: string;
  category?: string;
  status_category?: string;
  is_open?: boolean;
};

type StatusListDto = {
  results?: StatusDto[];
};

export type FlowStatus = {
  id: string;
  name: string;
  category: string;
  isOpen: boolean;
};

function normalizeCreatedRequest(data: CreateRequestDto): CreateRequestResult {
  return {
    requestId: data.request_id ?? "",
    title: data.title ?? "Untitled request",
  };
}

function normalizeStatus(status: StatusDto): FlowStatus {
  const category = status.category ?? status.status_category ?? "";
  const name = status.name ?? status.label ?? category ?? "Status";

  return {
    id: status.status_id ?? status.statusid ?? status.id ?? "",
    name,
    category,
    isOpen: Boolean(status.is_open) || category.toLowerCase() === "open" || name.toLowerCase() === "open",
  };
}

export async function listFlowStatuses(flowId: string) {
  const response = await api.get<StatusListDto | StatusDto[]>(`/flows/${encodeURIComponent(flowId)}/statuses/`);
  const statuses = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return statuses.map(normalizeStatus).filter((status) => status.id);
}

export async function createRequest(payload: CreateRequestPayload) {
  const response = await api.post<CreateRequestDto>("/requests/", payload);
  return normalizeCreatedRequest(response.data);
}
