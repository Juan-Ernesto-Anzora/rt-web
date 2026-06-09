import api from "../lib/api";
import {
  RequestComment,
  RequestCommentAttachment,
  createRequestComment,
  listRequestAttachments,
  listRequestComments,
  normalizeAttachment,
} from "../features/requestActivity";
import {
  displayAssignee,
  displayFlow,
  displayStatus,
  displayUser,
  statusCategory,
  statusIsTerminal,
  userId,
  type FlowDto,
  type StatusDto,
  type UserDto,
} from "./requestDisplay";

export type RequestDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  statusCategory?: string;
  statusIsTerminal: boolean;
  priority: string;
  assigneeId: string | null;
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

export type RequestTransition = {
  id: string;
  label: string;
  toStatus?: string;
  toStatusCategory?: string;
  isTerminal: boolean;
  requiresComment: boolean;
};

export type ApplyTransitionPayload = {
  transitionId: string;
  comment?: string;
};

export type TenantUser = {
  id: string;
  label: string;
  email?: string;
  displayName?: string;
};

type AttachmentDto = {
  id?: string;
  attachmentid?: string;
  attachment_id?: string;
  file_name?: string;
  filename?: string;
  size?: number;
  sizebytes?: number;
  size_bytes?: number;
  content_type?: string;
  contenttype?: string;
  scan_status?: "pending" | "clean" | "blocked";
  scanstatus?: "pending" | "clean" | "blocked";
  download_url?: string;
  storageurl?: string;
  storage_url?: string;
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
  status_name?: string;
  status_category?: string;
  priority?: string;
  assignee_id?: string | null;
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

type TransitionDto = {
  id?: string;
  transition_id?: string;
  name?: string;
  label?: string;
  to_status?: string | StatusDto | null;
  to_status_name?: string;
  is_terminal?: boolean;
  requires_comment?: boolean;
};

type TransitionResponseDto = {
  results?: TransitionDto[];
  transitions?: TransitionDto[];
};

type UserLookupResponseDto = {
  results?: UserDto[];
  users?: UserDto[];
};

function normalizeTenantUser(user: UserDto): TenantUser {
  const id = user.user_id ?? user.id ?? "";
  const label = user.display_name ?? user.email ?? user.employee_code ?? id;
  return {
    id,
    label,
    email: user.email,
    displayName: user.display_name,
  };
}

function normalizeDetail(detail: RequestDetailDto): RequestDetail {
  return {
    id: detail.request_id ?? detail.human_id ?? detail.humanid ?? detail.requestid ?? "-",
    title: detail.title ?? "Untitled request",
    description: detail.description ?? "",
    status: displayStatus(detail.status, detail.status_name ?? detail.status_category ?? detail.statusid),
    statusCategory: statusCategory(detail.status, detail.status_category),
    statusIsTerminal: statusIsTerminal(detail.status),
    priority: detail.priority ?? "-",
    assigneeId: userId(detail.assignee, detail.assignee_id),
    assignee: displayAssignee(detail.assignee, detail.assignee_name),
    requester: displayUser(detail.requester, detail.requester_name),
    flow: displayFlow(detail.flow, detail.flow_name),
    dueAt: detail.due_at,
    createdAt: detail.created_at ?? "",
    updatedAt: detail.updated_at ?? "",
    attachments: (detail.attachments ?? []).map(normalizeAttachment),
  };
}

function normalizeTransition(transition: TransitionDto): RequestTransition {
  const toStatus = displayStatus(transition.to_status, transition.to_status_name);
  const isTerminal = Boolean(transition.is_terminal) || statusIsTerminal(transition.to_status);
  return {
    id: transition.transition_id ?? transition.id ?? "",
    label:
      transition.label ??
      transition.name ??
      (isTerminal ? "Close Request" : toStatus && toStatus !== "-" ? `Move to ${toStatus}` : "Apply Action"),
    toStatus,
    toStatusCategory: statusCategory(transition.to_status),
    isTerminal,
    requiresComment: Boolean(transition.requires_comment),
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

export async function listRequestTransitions(requestId: string): Promise<RequestTransition[]> {
  const response = await api.get<TransitionResponseDto | TransitionDto[]>(
    `/requests/${encodeURIComponent(requestId)}/available-transitions/`,
  );
  const transitions = Array.isArray(response.data)
    ? response.data
    : response.data.transitions ?? response.data.results ?? [];
  return transitions.map(normalizeTransition).filter((transition) => transition.id);
}

export async function listTenantUsers(): Promise<TenantUser[]> {
  const response = await api.get<UserLookupResponseDto | UserDto[]>("/users/");
  const users = Array.isArray(response.data) ? response.data : response.data.users ?? response.data.results ?? [];
  return users.map(normalizeTenantUser).filter((user) => user.id);
}

export async function updateRequestAssignee(requestId: string, assigneeId: string | null): Promise<void> {
  await api.patch(`/requests/${encodeURIComponent(requestId)}/`, {
    assignee_id: assigneeId,
  });
}

export async function applyRequestTransition(requestId: string, payload: ApplyTransitionPayload) {
  const comment = payload.comment?.trim();
  await api.post(`/requests/${encodeURIComponent(requestId)}/transition/`, {
    transition_id: payload.transitionId,
    comment_markdown: comment || undefined,
  });

  if (comment) {
    await createRequestComment(requestId, comment, []);
  }
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
  const [commentsResult, attachmentsResult, activityResult] = await Promise.allSettled([
    listRequestComments(requestId),
    listRequestAttachments(requestId),
    getRequestActivity(requestId),
  ]);
  const comments = commentsResult.status === "fulfilled" ? commentsResult.value : [];
  const externalAttachments = attachmentsResult.status === "fulfilled" ? attachmentsResult.value : [];
  const activity = activityResult.status === "fulfilled" ? activityResult.value : [];

  return {
    detail: {
      ...detail,
      attachments: [...detail.attachments, ...externalAttachments],
    },
    comments,
    activity,
  };
}
