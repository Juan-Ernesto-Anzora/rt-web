import api from "../lib/api";
import {
  displayFlow,
  displayStatus,
  displayUser,
  statusCategory,
  type FlowDto,
  type StatusDto,
  type UserDto,
} from "./requestDisplay";

export type DashboardRequest = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  statusCategory?: string;
  priority: string;
  assignee: string;
  requester: string;
  updatedAt: string;
  flow?: string;
  dueAt?: string;
};

export type DashboardSummary = {
  open: number;
  inProgress: number;
  dueToday: number;
  overdue: number;
};

export type DashboardListKey = "my_tasks" | "other_tasks" | "my_requests" | "recently_updated";

export type DashboardListParams = {
  list: DashboardListKey;
  page?: number;
  pageSize?: number;
  sort?: "-updated_at" | "updated_at";
  quickFilter?: "my_open" | "high_priority" | "closed" | "unassigned" | "";
};

export type DashboardListResponse = {
  results: DashboardRequest[];
  count: number;
};

type RequestDto = {
  requestid?: string;
  humanid?: string;
  request_id?: string;
  human_id?: string;
  title?: string;
  statusid?: string;
  status_id?: string;
  status_name?: string;
  status_category?: string;
  status?: string | StatusDto | null;
  priority?: string;
  assignee_id?: string | null;
  assignee?: string | UserDto | null;
  assignee_name?: string | null;
  requester_id?: string | null;
  requester?: string | UserDto | null;
  requester_name?: string | null;
  updated_at?: string;
  flow?: string | FlowDto | null;
  flow_name?: string;
  due_at?: string;
};

type RequestListDto = {
  results?: RequestDto[];
  count?: number;
};

type DashboardSummaryDto = {
  open?: number;
  open_count?: number;
  in_progress?: number;
  inProgress?: number;
  in_progress_count?: number;
  due_today?: number;
  dueToday?: number;
  due_today_count?: number;
  overdue?: number;
  overdue_count?: number;
  kpis?: DashboardSummaryDto;
  counts?: DashboardSummaryDto;
};

function normalizeRequest(request: RequestDto): DashboardRequest {
  const requestId = request.request_id ?? "";
  const statusLabel = displayStatus(request.status, request.status_name ?? request.status_category);
  const requesterLabel = displayUser(request.requester, request.requester_name);
  const flowLabel = displayFlow(request.flow, request.flow_name);
  return {
    id: request.human_id ?? request.humanid ?? "ID unavailable",
    requestId,
    title: request.title ?? "Untitled request",
    status: statusLabel === "-" ? "Status unavailable" : statusLabel,
    statusCategory: statusCategory(request.status, request.status_category),
    priority: request.priority ?? "-",
    assignee: request.assignee === null && !request.assignee_id ? "Unassigned" : request.assignee ? displayUser(request.assignee, request.assignee_name, "Assignee unavailable") : "Assignee unavailable",
    requester: requesterLabel === "-" ? "Requester unavailable" : requesterLabel,
    updatedAt: request.updated_at ?? "",
    flow: flowLabel === "-" ? "Flow unavailable" : flowLabel,
    dueAt: request.due_at,
  };
}

function normalizeList(data: RequestListDto | RequestDto[]): DashboardListResponse {
  const results = Array.isArray(data) ? data : data.results ?? [];
  return {
    results: results.map(normalizeRequest),
    count: Array.isArray(data) ? results.length : data.count ?? results.length,
  };
}

function requiredNumber(field: string, ...values: Array<number | undefined>) {
  const value = values.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  if (value === undefined) throw new Error(`Dashboard summary is missing ${field}.`);
  return value;
}

function normalizeSummary(data: DashboardSummaryDto): DashboardSummary {
  const source = data.kpis ?? data.counts ?? data;
  return {
    open: requiredNumber("open", source.open, source.open_count),
    inProgress: requiredNumber("in_progress", source.inProgress, source.in_progress, source.in_progress_count),
    dueToday: requiredNumber("due_today", source.dueToday, source.due_today, source.due_today_count),
    overdue: requiredNumber("overdue", source.overdue, source.overdue_count),
  };
}

function paramsForList({ list, page = 1, pageSize = 10, sort = "-updated_at", quickFilter }: DashboardListParams) {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
    sort,
  };

  if (list === "my_tasks") params.mine = true;
  if (list === "other_tasks") params.mine = false;
  if (list === "my_requests") params.requested_by_me = true;

  if (quickFilter === "my_open") {
    params.mine = true;
    params.closed = false;
  }
  if (quickFilter === "high_priority") params.priority = "high";
  if (quickFilter === "closed") params.closed = true;
  if (quickFilter === "unassigned") params.assignee = "unassigned";

  return params;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummaryDto>("/dashboard/summary/");
  return normalizeSummary(response.data);
}

export async function getDashboardRequests(params: DashboardListParams): Promise<DashboardListResponse> {
  const response = await api.get<RequestListDto | RequestDto[]>("/requests/", {
    params: paramsForList(params),
  });
  return normalizeList(response.data);
}
