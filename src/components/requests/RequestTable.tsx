import { DashboardRequest } from "../../api/dashboard";
import { PriorityChip } from "./PriorityChip";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestTable({
  requests,
  onOpenRequest,
}: {
  requests: DashboardRequest[];
  onOpenRequest(requestId: string): void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_100px_100px_132px_132px_110px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-600">
        <div>Human ID</div>
        <div>Title</div>
        <div>Status</div>
        <div>Priority</div>
        <div>Assignee</div>
        <div>Requester</div>
        <div>Updated</div>
      </div>
      <div>
        {requests.map((request) => (
          <button
            key={request.id}
            type="button"
            onClick={() => {
              if (request.requestId) onOpenRequest(request.requestId);
            }}
            disabled={!request.requestId}
            className="grid min-h-12 w-full grid-cols-[120px_1fr_100px_100px_132px_132px_110px] items-center px-4 text-left text-sm hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="font-semibold text-neutral-800">{request.id}</div>
            <div className="truncate pr-4 text-neutral-900">{request.title}</div>
            <div>
              <StatusBadge status={request.status} category={request.statusCategory} />
            </div>
            <div>
              <PriorityChip priority={request.priority} />
            </div>
            <div className="truncate pr-4 text-neutral-700">{request.assignee}</div>
            <div className="truncate pr-4 text-neutral-700">{request.requester}</div>
            <div className="text-neutral-700">{formatDate(request.updatedAt)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
