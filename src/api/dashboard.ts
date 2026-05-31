import api from "../lib/api";

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
  sort?: string;
  quickFilter?: string;
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
  status?: string | StatusDto | null;
  priority?: string;
  assignee?: string | UserDto | null;
  assignee_name?: string | null;
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

type FlowDto = {
  flow_id?: string;
  name?: string;
  description?: string;
};

type StatusDto = {
  status_id?: string;
  name?: string;
  category?: string;
  is_terminal?: boolean;
};

type UserDto = {
  user_id?: string;
  email?: string;
  display_name?: string;
  employee_code?: string;
  avatar_url?: string;
};

function displayFlow(flow?: string | FlowDto | null, fallback?: string) {
  if (typeof flow === "string") return flow;
  return flow?.name ?? fallback ?? "-";
}

function displayStatus(status?: string | StatusDto | null, fallback?: string) {
  if (typeof status === "string") return status;
  return status?.name ?? fallback ?? "-";
}

function statusCategory(status?: string | StatusDto | null) {
  if (!status || typeof status === "string") return undefined;
  return status.category;
}

function displayUser(user?: string | UserDto | null, fallback?: string | null, empty = "-") {
  if (typeof user === "string") return user;
  return user?.display_name ?? user?.email ?? fallback ?? empty;
}

function normalizeRequest(request: RequestDto): DashboardRequest {
  const requestId = request.request_id ?? "";
  return {
    id: (request.human_id ?? request.humanid ?? requestId) || request.requestid || "-",
    requestId,
    title: request.title ?? "Untitled request",
    status: displayStatus(request.status, request.statusid),
    statusCategory: statusCategory(request.status),
    priority: request.priority ?? "-",
    assignee: displayUser(request.assignee, request.assignee_name, "Unassigned"),
    requester: displayUser(request.requester, request.requester_name),
    updatedAt: request.updated_at ?? "",
    flow: displayFlow(request.flow, request.flow_name),
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

async function getRequestCount(params: Record<string, string | number | boolean>) {
  const response = await api.get<RequestListDto | RequestDto[]>("/requests/", {
    params: { ...params, page: 1, page_size: 1 },
  });
  return normalizeList(response.data).count;
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
  const [open, inProgress, dueToday, overdue] = await Promise.all([
    getRequestCount({ status_category: "open" }),
    getRequestCount({ status_category: "in_progress" }),
    getRequestCount({ due: "today" }),
    getRequestCount({ overdue: true }),
  ]);

  return {
    open,
    inProgress,
    dueToday,
    overdue,
  };
}

export async function getDashboardRequests(params: DashboardListParams): Promise<DashboardListResponse> {
  const response = await api.get<RequestListDto | RequestDto[]>("/requests/", {
    params: paramsForList(params),
  });
  return normalizeList(response.data);
}
