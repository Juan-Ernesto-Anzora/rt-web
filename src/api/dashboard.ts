import api from "../lib/api";

export type DashboardRequest = {
  id: string;
  title: string;
  status: string;
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
  title?: string;
  statusid?: string;
  status?: string;
  priority?: string;
  assignee?: string | null;
  assignee_name?: string | null;
  requester?: string | null;
  requester_name?: string | null;
  updated_at?: string;
  flow?: string;
  flow_name?: string;
  due_at?: string;
};

type RequestListDto = {
  results?: RequestDto[];
  count?: number;
};

function normalizeRequest(request: RequestDto): DashboardRequest {
  return {
    id: request.humanid ?? request.requestid ?? "-",
    title: request.title ?? "Untitled request",
    status: request.status ?? request.statusid ?? "-",
    priority: request.priority ?? "-",
    assignee: request.assignee_name ?? request.assignee ?? "-",
    requester: request.requester_name ?? request.requester ?? "-",
    updatedAt: request.updated_at ?? "",
    flow: request.flow_name ?? request.flow,
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
