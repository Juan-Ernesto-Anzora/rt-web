import axios from "axios";
import api from "../lib/api";
import { listFlowStatuses, type FlowStatus } from "./requestCreate";
import { listTenantUsers, type TenantUser } from "./requestDetail";

export type ReportFilters = {
  q: string;
  flowId: string;
  statusId: string;
  priority: string;
  requesterId: string;
  assigneeId: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  dueFrom: string;
  dueTo: string;
};

export type ReportSummary = {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  closed: number;
  dueToday: number;
  overdue: number;
  unassigned: number;
  assignedToMe: number;
  byPriority: Array<{ priority: string; count: number }>;
  byStatus: Array<{ statusId: string; name: string; category: string; count: number }>;
};

export type ReportLookup = { id: string; label: string };

type ReportSummaryDto = {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  closed: number;
  due_today: number;
  overdue: number;
  unassigned: number;
  assigned_to_me: number;
  by_priority: Array<{ priority: string; count: number }>;
  by_status: Array<{ status_id: string; name: string; category: string; count: number }>;
};

type FlowDto = { flow_id?: string; name?: string };
type PageDto<T> = { results?: T[] };

function dateBoundary(value: string, end: boolean) {
  if (!value) return undefined;
  const suffix = end ? "T23:59:59.999" : "T00:00:00.000";
  return new Date(`${value}${suffix}`).toISOString();
}

export function reportQueryParams(filters: ReportFilters) {
  return {
    q: filters.q.trim() || undefined,
    flow_id: filters.flowId || undefined,
    status_id: filters.statusId || undefined,
    priority: filters.priority || undefined,
    requester_id: filters.requesterId || undefined,
    assignee_id: filters.assigneeId || undefined,
    created_from: dateBoundary(filters.createdFrom, false),
    created_to: dateBoundary(filters.createdTo, true),
    updated_from: dateBoundary(filters.updatedFrom, false),
    updated_to: dateBoundary(filters.updatedTo, true),
    due_from: dateBoundary(filters.dueFrom, false),
    due_to: dateBoundary(filters.dueTo, true),
  };
}

function normalizeSummary(data: ReportSummaryDto): ReportSummary {
  return {
    total: data.total,
    open: data.open,
    inProgress: data.in_progress,
    waiting: data.waiting,
    closed: data.closed,
    dueToday: data.due_today,
    overdue: data.overdue,
    unassigned: data.unassigned,
    assignedToMe: data.assigned_to_me,
    byPriority: data.by_priority ?? [],
    byStatus: (data.by_status ?? []).map((item) => ({
      statusId: item.status_id,
      name: item.name,
      category: item.category,
      count: item.count,
    })),
  };
}

export async function getReportSummary(filters: ReportFilters) {
  const response = await api.get<ReportSummaryDto>("/reports/summary/", { params: reportQueryParams(filters) });
  return normalizeSummary(response.data);
}

export async function listReportFlows(): Promise<ReportLookup[]> {
  const response = await api.get<PageDto<FlowDto> | FlowDto[]>("/flows/", { params: { page_size: 100 } });
  const items = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return items
    .map((item) => ({ id: item.flow_id ?? "", label: item.name ?? "Unnamed flow" }))
    .filter((item) => item.id);
}

export function listReportStatuses(flowId: string): Promise<FlowStatus[]> {
  return listFlowStatuses(flowId);
}

export async function listReportUsers(): Promise<TenantUser[]> {
  return listTenantUsers();
}

function filenameFromDisposition(disposition: string | undefined) {
  if (!disposition) return null;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const basic = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let decoded = basic;
  if (utf8) {
    try {
      decoded = decodeURIComponent(utf8);
    } catch {
      decoded = undefined;
    }
  }
  if (!decoded) return null;
  const safe = decoded.replace(/[\\/:*?"<>|\r\n]/g, "-").trim();
  return safe.toLowerCase().endsWith(".csv") ? safe : null;
}

async function blobErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Could not export the report.";
  const status = error.response?.status;
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // The API may return an empty or non-JSON error body.
    }
  }
  if (status === 403) return "You do not have reports.export permission for this tenant.";
  return "Could not export the report. Review the filters and try again.";
}

export async function downloadReportCsv(filters: ReportFilters) {
  try {
    const response = await api.get<Blob>("/reports/requests/export/", {
      params: { ...reportQueryParams(filters), format: "csv" },
      responseType: "blob",
    });
    const filename = filenameFromDisposition(response.headers["content-disposition"]) ?? "rt-requests.csv";
    const objectUrl = URL.createObjectURL(response.data);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    return filename;
  } catch (error) {
    throw new Error(await blobErrorMessage(error));
  }
}
