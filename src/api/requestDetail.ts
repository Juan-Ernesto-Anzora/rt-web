import api from "../lib/api";
import { RequestComment, RequestCommentAttachment, listRequestComments } from "../features/requestActivity";

export type RequestDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
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

type RequestDetailDto = {
  requestid?: string;
  humanid?: string;
  request_id?: string;
  human_id?: string;
  title?: string;
  description?: string;
  status?: string;
  statusid?: string;
  priority?: string;
  assignee?: string | null;
  assignee_name?: string | null;
  requester?: string | null;
  requester_name?: string | null;
  flow?: string;
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

function normalizeDetail(detail: RequestDetailDto): RequestDetail {
  return {
    id: detail.human_id ?? detail.humanid ?? detail.request_id ?? detail.requestid ?? "-",
    title: detail.title ?? "Untitled request",
    description: detail.description ?? "",
    status: detail.status ?? detail.statusid ?? "-",
    priority: detail.priority ?? "-",
    assignee: detail.assignee_name ?? detail.assignee ?? "-",
    requester: detail.requester_name ?? detail.requester ?? "-",
    flow: detail.flow_name ?? detail.flow ?? "-",
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
  const [detail, comments, activity] = await Promise.all([
    getRequestDetail(requestId),
    listRequestComments(requestId),
    getRequestActivity(requestId),
  ]);

  return { detail, comments, activity };
}
