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
    <div role="region" aria-label="Requests" tabIndex={0} className="overflow-x-auto rounded-lg border border-neutral-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
      <table className="w-full min-w-[820px] text-left text-sm">
        <caption className="sr-only">Request queue results</caption>
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600"><tr><th scope="col" className="px-4 py-3">Human ID</th><th scope="col" className="px-4 py-3">Title</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Priority</th><th scope="col" className="px-4 py-3">Assignee</th><th scope="col" className="px-4 py-3">Requester</th><th scope="col" className="px-4 py-3">Updated</th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
        {requests.map((request) => (
          <tr key={request.id} className="h-12 hover:bg-primary-50"><td className="px-4 font-semibold text-neutral-800">{request.id}</td><td className="max-w-72 truncate px-4 text-neutral-900">{request.title}</td><td className="px-4"><StatusBadge status={request.status} category={request.statusCategory} /></td><td className="px-4"><PriorityChip priority={request.priority} /></td><td className="max-w-40 truncate px-4 text-neutral-700">{request.assignee}</td><td className="max-w-40 truncate px-4 text-neutral-700">{request.requester}</td><td className="px-4 text-neutral-700">{formatDate(request.updatedAt)}</td><td className="px-4 text-right"><button type="button" onClick={() => request.requestId && onOpenRequest(request.requestId)} disabled={!request.requestId} aria-label={`Open request ${request.id}`} className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-50">Open</button></td></tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
