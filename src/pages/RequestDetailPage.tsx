import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RequestActivityEvent, RequestDetail, getRequestDetailBundle } from "../api/requestDetail";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { PriorityChip } from "../components/requests/PriorityChip";
import { StatusBadge } from "../components/requests/StatusBadge";
import { RequestComment } from "../features/requestActivity";

const FALLBACK_DETAIL: RequestDetail = {
  id: "RT-2025-001001",
  title: "VPN not connecting",
  description: "User cannot connect after password rotation. VPN client reports invalid profile.",
  status: "Open",
  priority: "High",
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

function ActivitySection({ events }: { events: RequestActivityEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No activity yet." body="Request history will appear here." />;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-900">
              <span className="font-semibold">{event.actorName}</span> {event.verb}
            </div>
            <time className="text-xs text-neutral-500">{formatDate(event.createdAt)}</time>
          </div>
          {event.payload && <div className="mt-2 text-xs text-neutral-600">{event.payload}</div>}
        </div>
      ))}
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
              <ActivitySection events={activity} />
            </div>
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-4">
          <DetailField label="Status" value={detail.status} />
          <DetailField label="Priority" value={detail.priority} />
          <DetailField label="Assignee" value={detail.assignee} />
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
