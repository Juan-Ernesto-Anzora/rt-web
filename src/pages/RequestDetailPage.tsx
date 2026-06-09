import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  type RequestActivityEvent,
  type RequestDetail,
  type RequestTransition,
  type TenantUser,
  applyRequestTransition,
  getRequestDetailBundle,
  listTenantUsers,
  listRequestTransitions,
  updateRequestAssignee,
} from "../api/requestDetail";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { PriorityChip } from "../components/requests/PriorityChip";
import { StatusBadge } from "../components/requests/StatusBadge";
import { createRequestComment, RequestComment } from "../features/requestActivity";

const FALLBACK_DETAIL: RequestDetail = {
  id: "RT-2025-001001",
  title: "VPN not connecting",
  description: "User cannot connect after password rotation. VPN client reports invalid profile.",
  status: "Open",
  statusIsTerminal: false,
  priority: "High",
  assigneeId: "demo-assignee",
  assignee: "Ana Gomez",
  requester: "Carlos Diaz",
  flow: "IT Support",
  dueAt: "2025-08-23T17:00:00Z",
  createdAt: "2025-08-22T08:25:00Z",
  updatedAt: "2025-08-22T10:41:00Z",
  attachments: [
    {
      id: "attachment-001",
      fileName: "vpn-error-screenshot.png",
      size: 248_120,
      contentType: "image/png",
      scanStatus: "clean",
    },
  ],
};

const FALLBACK_COMMENTS: RequestComment[] = [
  {
    id: "comment-001",
    authorName: "Ana Gomez",
    body: "Confirmed the VPN profile fails after password rotation. Waiting on network team review.",
    createdAt: "2025-08-22T11:20:00Z",
    attachments: FALLBACK_DETAIL.attachments,
  },
];

const FALLBACK_ACTIVITY: RequestActivityEvent[] = [
  {
    id: "activity-001",
    actorName: "Carlos Diaz",
    verb: "created request",
    createdAt: "2025-08-22T08:25:00Z",
  },
  {
    id: "activity-002",
    actorName: "Ana Gomez",
    verb: "added comment",
    createdAt: "2025-08-22T11:20:00Z",
  },
];

const ENABLE_DEMO_DETAIL_FALLBACK = import.meta.env.VITE_ENABLE_DEMO_DETAIL_FALLBACK === "true";

type ApiErrorBody = {
  code?: string;
  message?: string;
  detail?: string;
  details?: Array<{ field?: string; message?: string }>;
  [key: string]: unknown;
};

function formatApiError(error: unknown, fallback: string) {
  const response = (error as AxiosError<ApiErrorBody>).response?.data;
  if (!response) return fallback;

  if (response.message) return response.message;
  if (response.detail) return response.detail;
  if (Array.isArray(response.details) && response.details.length > 0) {
    return response.details
      .map((detail) => (detail.field ? `${detail.field}: ${detail.message ?? "Invalid value."}` : detail.message))
      .filter(Boolean)
      .join(" ");
  }

  const fieldErrors = Object.entries(response)
    .filter(([key]) => !["code", "message", "detail", "details"].includes(key))
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) return value.map((item) => `${key}: ${String(item)}`);
      if (typeof value === "string") return [`${key}: ${value}`];
      return [];
    });

  return fieldErrors.length > 0 ? fieldErrors.join(" ") : fallback;
}

function formatDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function CommentsSection({ comments }: { comments: RequestComment[] }) {
  if (comments.length === 0) {
    return <EmptyState title="No comments yet." body="Conversation updates will appear here." />;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <article key={comment.id} className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-neutral-900">{comment.authorName}</div>
            <time className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</time>
          </div>
          {comment.body && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{comment.body}</p>}
          {comment.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {comment.attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700"
                >
                  {attachment.fileName}
                </span>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function UploadSection({
  comment,
  files,
  inputKey,
  submitting,
  error,
  success,
  onCommentChange,
  onFilesChange,
  onSubmit,
}: {
  comment: string;
  files: File[];
  inputKey: number;
  submitting: boolean;
  error: string | null;
  success: string | null;
  onCommentChange(comment: string): void;
  onFilesChange(files: File[]): void;
  onSubmit(): void;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-danger-500 bg-white px-3 py-2 text-sm font-semibold text-danger-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
          {success}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="upload-comment">
          Comment
        </label>
        <textarea
          id="upload-comment"
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
          placeholder="Add context for the uploaded files."
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="upload-files">
          Attach files
        </label>
        <input
          key={inputKey}
          id="upload-files"
          type="file"
          multiple
          onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
          className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-50"
        />
        <div className="mt-1 text-xs text-neutral-500">
          {files.length > 0 ? `${files.length} selected` : "Multiple files are grouped into one comment."}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onSubmit}
        disabled={submitting || (!comment.trim() && files.length === 0)}
      >
        {submitting ? "Uploading" : "Add Comment / Upload"}
      </button>
    </div>
  );
}

function AttachmentsSection({ detail, comments }: { detail: RequestDetail; comments: RequestComment[] }) {
  const attachments = useMemo(() => {
    const byId = new Map(detail.attachments.map((attachment) => [attachment.id, attachment]));
    comments.forEach((comment) => {
      comment.attachments.forEach((attachment) => byId.set(attachment.id, attachment));
    });
    return Array.from(byId.values());
  }, [comments, detail.attachments]);

  if (attachments.length === 0) {
    return <EmptyState title="No attachments." body="Clean scanned files will appear here once uploaded." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="truncate text-sm font-semibold text-neutral-900">{attachment.fileName}</div>
          <div className="mt-1 text-xs text-neutral-600">
            {formatFileSize(attachment.size)}
            {attachment.scanStatus ? ` - scan ${attachment.scanStatus}` : ""}
          </div>
          {attachment.downloadUrl && (
            <a
              href={attachment.downloadUrl}
              className="mt-2 inline-block text-sm font-semibold text-primary-700 hover:text-primary-600"
            >
              Open
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function ActivitySection({ events, comments }: { events: RequestActivityEvent[]; comments: RequestComment[] }) {
  const timelineEvents = useMemo(() => {
    const commentEvents: RequestActivityEvent[] = comments
      .filter((comment) => comment.body.trim())
      .map((comment) => ({
        id: `comment-${comment.id}`,
        actorName: comment.authorName,
        verb: "commented",
        createdAt: comment.createdAt,
        payload: comment.body,
      }));

    return [...events, ...commentEvents].sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }, [comments, events]);

  if (timelineEvents.length === 0) {
    return <EmptyState title="No activity yet." body="Request history will appear here." />;
  }

  return (
    <div className="space-y-3">
      {timelineEvents.map((event) => (
        <div key={event.id} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-900">
              <span className="font-semibold">{event.actorName}</span> {event.verb}
            </div>
            <time className="text-xs text-neutral-500">{formatDate(event.createdAt)}</time>
          </div>
          {event.payload && <div className="mt-2 whitespace-pre-wrap text-xs text-neutral-600">{event.payload}</div>}
        </div>
      ))}
    </div>
  );
}

function TransitionActions({
  transitions,
  selectedTransitionId,
  comment,
  submitting,
  loading,
  error,
  success,
  onSelect,
  onCommentChange,
  onSubmit,
  onRetry,
}: {
  transitions: RequestTransition[];
  selectedTransitionId: string;
  comment: string;
  submitting: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  onSelect(transitionId: string): void;
  onCommentChange(comment: string): void;
  onSubmit(): void;
  onRetry(): void;
}) {
  if (loading) {
    return <div className="text-sm text-neutral-500">Loading actions...</div>;
  }

  if (transitions.length === 0) {
    return <EmptyState title="No actions available." body="Available workflow actions will appear here." />;
  }

  const selectedTransition = transitions.find((transition) => transition.id === selectedTransitionId);

  return (
    <div className="space-y-3">
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {success && (
        <div className="rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
          {success}
        </div>
      )}
      <div className="grid gap-2">
        {transitions.map((transition) => (
          <button
            key={transition.id}
            type="button"
            onClick={() => onSelect(transition.id)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
              selectedTransitionId === transition.id
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <span>{transition.label}</span>
            {transition.toStatus && !transition.label.toLowerCase().includes(transition.toStatus.toLowerCase()) && (
              <span className="ml-2 text-xs font-medium text-neutral-500">to {transition.toStatus}</span>
            )}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="transition-comment">
          Comment{selectedTransition?.requiresComment ? <span className="text-danger-500"> *</span> : null}
        </label>
        <textarea
          id="transition-comment"
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
          placeholder="Add context for this workflow action."
        />
      </div>
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={onSubmit}
        disabled={submitting || !selectedTransitionId}
      >
        {submitting ? "Applying" : selectedTransition?.isTerminal ? "Close Request" : "Apply Action"}
      </button>
    </div>
  );
}

function AssignmentControl({
  currentAssignee,
  currentAssigneeId,
  users,
  selectedAssigneeId,
  loading,
  saving,
  error,
  success,
  onChange,
  onSave,
  onRetry,
}: {
  currentAssignee: string;
  currentAssigneeId: string | null;
  users: TenantUser[];
  selectedAssigneeId: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onChange(assigneeId: string): void;
  onSave(): void;
  onRetry(): void;
}) {
  const normalizedCurrentId = currentAssigneeId ?? "";
  const hasChanged = selectedAssigneeId !== normalizedCurrentId;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase text-neutral-500">Current Assignee</div>
        <div className="mt-1 text-sm font-semibold text-neutral-900">{currentAssignee}</div>
      </div>
      {success && (
        <div className="rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
          {success}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="assignee-select">
          Assign to
        </label>
        <select
          id="assignee-select"
          value={selectedAssigneeId}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading || saving}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
              {user.email && user.email !== user.label ? ` (${user.email})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          {loading ? "Loading tenant users..." : "Unassigned is saved as null."}
        </p>
        {error && (
          <div className="mt-2 rounded-lg border border-danger-500 bg-white px-3 py-2 text-xs text-danger-500">
            <div>{error}</div>
            <button type="button" className="mt-1 font-semibold underline" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-secondary w-full"
        onClick={onSave}
        disabled={loading || saving || !hasChanged}
      >
        {saving ? "Saving" : "Save Assignment"}
      </button>
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const requestId = id ?? "";
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [activity, setActivity] = useState<RequestActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [transitions, setTransitions] = useState<RequestTransition[]>([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);
  const [transitionsError, setTransitionsError] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState("");
  const [transitionComment, setTransitionComment] = useState("");
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [usersLoadAttempt, setUsersLoadAttempt] = useState(0);
  const [uploadComment, setUploadComment] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!requestId) return;
      setLoading(true);
      try {
        const bundle = await getRequestDetailBundle(requestId);
        if (cancelled) return;
        setDetail(bundle.detail);
        setComments(bundle.comments);
        setActivity(bundle.activity);
        setError(null);
      } catch {
        if (cancelled) return;
        if (ENABLE_DEMO_DETAIL_FALLBACK) {
          setDetail({ ...FALLBACK_DETAIL, id: requestId });
          setComments(FALLBACK_COMMENTS);
          setActivity(FALLBACK_ACTIVITY);
          setError("Could not load request detail from API. Showing local demo data.");
          return;
        }
        setDetail(null);
        setComments([]);
        setActivity([]);
        setError("Could not load request detail from API. Please confirm the request exists and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [requestId, loadAttempt]);

  useEffect(() => {
    let cancelled = false;

    async function loadTransitions() {
      if (!requestId || !detail) {
        setTransitions([]);
        setSelectedTransitionId("");
        setTransitionsError(null);
        return;
      }

      setTransitionsLoading(true);
      try {
        const nextTransitions = await listRequestTransitions(requestId);
        if (cancelled) return;
        setTransitions(nextTransitions);
        setSelectedTransitionId((current) =>
          current && nextTransitions.some((transition) => transition.id === current) ? current : nextTransitions[0]?.id ?? "",
        );
        setTransitionsError(null);
      } catch (requestError) {
        if (cancelled) return;
        setTransitions([]);
        setSelectedTransitionId("");
        setTransitionsError(formatApiError(requestError, "Could not load workflow actions."));
      } finally {
        if (!cancelled) setTransitionsLoading(false);
      }
    }

    loadTransitions();

    return () => {
      cancelled = true;
    };
  }, [detail, loadAttempt, requestId]);

  useEffect(() => {
    setSelectedAssigneeId(detail?.assigneeId ?? "");
  }, [detail?.assigneeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      try {
        const nextUsers = await listTenantUsers();
        if (cancelled) return;
        setUsers(nextUsers);
        setUsersError(null);
      } catch (requestError) {
        if (cancelled) return;
        setUsers([]);
        setUsersError(formatApiError(requestError, "Could not load tenant users."));
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [usersLoadAttempt]);

  async function submitTransition() {
    const selectedTransition = transitions.find((transition) => transition.id === selectedTransitionId);
    if (!requestId || !selectedTransition) return;

    if (selectedTransition.requiresComment && !transitionComment.trim()) {
      setTransitionsError("A comment is required for this workflow action.");
      return;
    }

    setTransitionSubmitting(true);
    setTransitionsError(null);
    setTransitionSuccess(null);
    try {
      await applyRequestTransition(requestId, {
        transitionId: selectedTransition.id,
        comment: transitionComment,
      });
      setTransitionComment("");
      setSelectedTransitionId("");
      setTransitionSuccess("Workflow action applied.");
      setLoadAttempt((current) => current + 1);
    } catch (requestError) {
      setTransitionsError(formatApiError(requestError, "Could not apply the workflow action. Please try again."));
    } finally {
      setTransitionSubmitting(false);
    }
  }

  async function saveAssignment() {
    if (!requestId) return;

    setAssignmentSaving(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);
    try {
      await updateRequestAssignee(requestId, selectedAssigneeId || null);
      setAssignmentSuccess("Assignment updated.");
      setLoadAttempt((current) => current + 1);
    } catch (requestError) {
      setAssignmentError(formatApiError(requestError, "Could not update assignment. Please try again."));
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function submitUpload() {
    if (!requestId) return;
    if (!uploadComment.trim() && uploadFiles.length === 0) {
      setUploadError("Add a comment or choose at least one file.");
      return;
    }

    setUploadSubmitting(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      await createRequestComment(requestId, uploadComment.trim(), uploadFiles);
      setUploadComment("");
      setUploadFiles([]);
      setUploadInputKey((current) => current + 1);
      setUploadSuccess(uploadFiles.length > 0 ? "Upload submitted." : "Comment added.");
      setLoadAttempt((current) => current + 1);
    } catch (requestError) {
      setUploadError(formatApiError(requestError, "Could not add comment or upload files. Please try again."));
    } finally {
      setUploadSubmitting(false);
    }
  }

  if (!detail && loading) {
    return <div className="p-6 text-sm text-neutral-500">Loading request detail...</div>;
  }

  if (!detail) {
    return (
      <ErrorState
        message={error ?? "Request detail is unavailable."}
        onRetry={() => setLoadAttempt((current) => current + 1)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-neutral-500">{detail.id}</div>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{detail.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={detail.status} category={detail.statusCategory} />
            <PriorityChip priority={detail.priority} />
          </div>
        </div>
      </header>

      <main className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 p-6">
        <div className="space-y-4">
          {error && <ErrorState message={error} />}

          <section className="card p-4">
            <h2 className="text-lg font-semibold text-neutral-900">Details</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">
              {detail.description || "No description provided."}
            </p>
          </section>

          <section className="card p-4">
            <h2 className="text-lg font-semibold text-neutral-900">Comments</h2>
            <div className="mt-3 border-b border-neutral-200 pb-4">
              <UploadSection
                comment={uploadComment}
                files={uploadFiles}
                inputKey={uploadInputKey}
                submitting={uploadSubmitting}
                error={uploadError}
                success={uploadSuccess}
                onCommentChange={(value) => {
                  setUploadComment(value);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                onFilesChange={(files) => {
                  setUploadFiles(files);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                onSubmit={submitUpload}
              />
            </div>
            <div className="mt-3">
              <CommentsSection comments={comments} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-lg font-semibold text-neutral-900">Attachments</h2>
            <div className="mt-3">
              <AttachmentsSection detail={detail} comments={comments} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
            <div className="mt-3">
              <ActivitySection events={activity} comments={comments} />
            </div>
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-4">
          <section className="space-y-3 border-b border-neutral-200 pb-4">
            <h2 className="text-sm font-semibold uppercase text-neutral-500">Workflow</h2>
            <TransitionActions
              transitions={transitions}
              selectedTransitionId={selectedTransitionId}
              comment={transitionComment}
              submitting={transitionSubmitting}
              loading={transitionsLoading}
              error={transitionsError}
              success={transitionSuccess}
              onSelect={(transitionId) => {
                setSelectedTransitionId(transitionId);
                setTransitionsError(null);
                setTransitionSuccess(null);
              }}
              onCommentChange={setTransitionComment}
              onSubmit={submitTransition}
              onRetry={() => setLoadAttempt((current) => current + 1)}
            />
          </section>
          <DetailField label="Status" value={detail.status} />
          <DetailField label="Priority" value={detail.priority} />
          <section className="space-y-3 border-y border-neutral-200 py-4">
            <h2 className="text-sm font-semibold uppercase text-neutral-500">Assignment</h2>
            <AssignmentControl
              currentAssignee={detail.assignee}
              currentAssigneeId={detail.assigneeId}
              users={users}
              selectedAssigneeId={selectedAssigneeId}
              loading={usersLoading}
              saving={assignmentSaving}
              error={assignmentError ?? usersError}
              success={assignmentSuccess}
              onChange={(assigneeId) => {
                setSelectedAssigneeId(assigneeId);
                setAssignmentError(null);
                setAssignmentSuccess(null);
              }}
              onSave={saveAssignment}
              onRetry={() => {
                setAssignmentError(null);
                setUsersLoadAttempt((current) => current + 1);
              }}
            />
          </section>
          <DetailField label="Requester" value={detail.requester} />
          <DetailField label="Flow" value={detail.flow} />
          <DetailField label="Due Date" value={formatDate(detail.dueAt)} />
          <DetailField label="Created" value={formatDate(detail.createdAt)} />
          <DetailField label="Updated" value={formatDate(detail.updatedAt)} />
        </aside>
      </main>
    </div>
  );
}
