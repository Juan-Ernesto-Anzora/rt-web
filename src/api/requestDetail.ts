import api from "../lib/api";
import { RequestComment, RequestCommentAttachment, listRequestComments } from "../features/requestActivity";

export type RequestDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  statusCategory?: string;
  priority: string;
  assignee: string;
  requester: string;
  flow: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  attachments: RequestCommentAttachment[];
};

export type RequestActivityEvent = {
  id: string;
  actorName: string;
  verb: string;
  createdAt: string;
  payload?: string;
};

export type RequestDetailBundle = {
  detail: RequestDetail;
  comments: RequestComment[];
  activity: RequestActivityEvent[];
};

type AttachmentDto = {
  id?: string;
  attachmentid?: string;
  file_name?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  scan_status?: "pending" | "clean" | "blocked";
  download_url?: string;
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

type RequestDetailDto = {
  requestid?: string;
  humanid?: string;
  request_id?: string;
  human_id?: string;
  title?: string;
  description?: string;
  status?: string | StatusDto | null;
  statusid?: string;
  priority?: string;
  assignee?: string | UserDto | null;
  assignee_name?: string | null;
  requester?: string | UserDto | null;
  requester_name?: string | null;
  flow?: string | FlowDto | null;
  flow_name?: string;
  due_at?: string;
  created_at?: string;
  updated_at?: string;
  attachments?: AttachmentDto[];
};

type ActivityDto = {
  id?: string;
  activityid?: string;
  actor_name?: string;
  actor?: { name?: string };
  verb?: string;
  action?: string;
  created_at?: string;
  payload?: unknown;
};

type ActivityResponseDto = {
  results?: ActivityDto[];
};

function normalizeAttachment(attachment: AttachmentDto): RequestCommentAttachment {
  return {
    id: attachment.id ?? attachment.attachmentid ?? crypto.randomUUID(),
    fileName: attachment.file_name ?? attachment.filename ?? "Attachment",
    size: attachment.size ?? 0,
    contentType: attachment.content_type,
    scanStatus: attachment.scan_status,
    downloadUrl: attachment.download_url,
  };
}

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

function normalizeDetail(detail: RequestDetailDto): RequestDetail {
  return {
    id: detail.request_id ?? detail.human_id ?? detail.humanid ?? detail.requestid ?? "-",
    title: detail.title ?? "Untitled request",
    description: detail.description ?? "",
    status: displayStatus(detail.status, detail.statusid),
    statusCategory: statusCategory(detail.status),
    priority: detail.priority ?? "-",
    assignee: displayUser(detail.assignee, detail.assignee_name, "Unassigned"),
    requester: displayUser(detail.requester, detail.requester_name),
    flow: displayFlow(detail.flow, detail.flow_name),
    dueAt: detail.due_at,
    createdAt: detail.created_at ?? "",
    updatedAt: detail.updated_at ?? "",
    attachments: (detail.attachments ?? []).map(normalizeAttachment),
  };
}

function normalizeActivity(activity: ActivityDto): RequestActivityEvent {
  return {
    id: activity.id ?? activity.activityid ?? crypto.randomUUID(),
    actorName: activity.actor_name ?? activity.actor?.name ?? "System",
    verb: activity.verb ?? activity.action ?? "updated request",
    createdAt: activity.created_at ?? new Date().toISOString(),
    payload: activity.payload ? JSON.stringify(activity.payload) : undefined,
  };
}

export async function getRequestDetail(requestId: string): Promise<RequestDetail> {
  const response = await api.get<RequestDetailDto>(`/requests/${encodeURIComponent(requestId)}/`);
  return normalizeDetail(response.data);
}

export async function getRequestActivity(requestId: string): Promise<RequestActivityEvent[]> {
  const response = await api.get<ActivityResponseDto | ActivityDto[]>(
    `/requests/${encodeURIComponent(requestId)}/activity/`,
    { params: { page_size: 25, sort: "-created_at" } },
  );
  const results = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return results.map(normalizeActivity);
}

export async function getRequestDetailBundle(requestId: string): Promise<RequestDetailBundle> {
  const detail = await getRequestDetail(requestId);
  const [commentsResult, activityResult] = await Promise.allSettled([
    listRequestComments(requestId),
    getRequestActivity(requestId),
  ]);
  const comments = commentsResult.status === "fulfilled" ? commentsResult.value : [];
  const activity = activityResult.status === "fulfilled" ? activityResult.value : [];

  return { detail, comments, activity };
}
