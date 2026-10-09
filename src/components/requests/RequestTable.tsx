import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { focusStyle } from "../ui/styles";
import { PriorityIndicator } from "./PriorityIndicator";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export type RequestRow = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  statusCategory?: string;
  priority: string;
  assignee: string;
  requester: string;
  flow?: string;
  updatedAt: string;
  matchContext?: string;
};

function RowStatus({ request }: { request: RequestRow }) {
  return request.status === "Status unavailable"
    ? <Badge label={request.status} tone="neutral" />
    : <StatusBadge status={request.status} category={request.statusCategory} />;
}

export function RequestTable({ requests, label = "Requests", caption = "Request queue results", fixed = false }: { requests: RequestRow[]; label?: string; caption?: string; fixed?: boolean }) {
  const title = (request: RequestRow) => request.requestId
    ? <Link to={"/requests/" + encodeURIComponent(request.requestId)} className={`inline-block max-w-full min-h-8 break-all rounded-small text-foreground hover:underline ${focusStyle}`}>{request.title}</Link>
    : <span className="break-all text-foreground">{request.title}</span>;

  return <div role="region" aria-label={label} tabIndex={0} className="min-w-0 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring">
    <table className={`hidden w-full text-left text-sm lg:table ${fixed ? "table-fixed min-w-[720px] xl:min-w-[1040px]" : "min-w-[720px]"}`}>
      <caption className="sr-only">{caption}</caption>
      <thead className="border-b border-border bg-surface-subtle text-text-muted"><tr>
        <th scope="col" className={`px-3 py-2 ${fixed ? "w-[14%]" : ""}`}>Human ID</th>
        <th scope="col" className={`px-3 py-2 ${fixed ? "w-[25%]" : ""}`}>Title</th>
        <th scope="col" className="px-3 py-2">Status</th>
        <th scope="col" className="px-3 py-2">Priority</th>
        <th scope="col" className="px-3 py-2">Assignee</th>
        <th scope="col" className="hidden px-3 py-2 xl:table-cell">Requester</th>
        <th scope="col" className="hidden px-3 py-2 xl:table-cell">Flow</th>
        <th scope="col" className="px-3 py-2">Updated</th>
      </tr></thead>
      <tbody className="divide-y divide-border/60">
        {requests.map((request, index) => <tr key={request.requestId || request.id + "-" + index} className="h-12 hover:bg-surface-hover focus-within:bg-surface-hover">
          <td className="break-all px-3 py-2 font-semibold text-foreground">{request.id}</td>
          <td className="min-w-0 max-w-80 break-words px-3 py-2 font-medium">{title(request)}{request.matchContext ? <div className="text-xs font-normal text-text-muted">{request.matchContext}</div> : null}</td>
          <td className="px-3 py-2"><RowStatus request={request} /></td>
          <td className="px-3 py-2"><PriorityIndicator priority={request.priority} concise /></td>
          <td className="max-w-40 break-all px-3 py-2 text-foreground">{request.assignee}</td>
          <td className="hidden max-w-40 break-all px-3 py-2 text-foreground xl:table-cell">{request.requester}</td>
          <td className="hidden max-w-32 break-all px-3 py-2 text-foreground xl:table-cell">{request.flow}</td>
          <td className="break-words px-3 py-2 text-text-muted">{formatDate(request.updatedAt)}</td>
        </tr>)}
      </tbody>
    </table>
    <ul className="divide-y divide-border/60 lg:hidden">
      {requests.map((request, index) => <li key={request.requestId || request.id + "-" + index} className="space-y-1 px-3 py-2 hover:bg-surface-hover focus-within:bg-surface-hover">
        <div className="break-all text-xs font-semibold text-text-muted">{request.id}</div>
        <div className="break-words text-sm font-semibold">{title(request)}</div>
        {request.matchContext ? <div className="text-xs text-text-muted">{request.matchContext}</div> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><RowStatus request={request} /><PriorityIndicator priority={request.priority} /></div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="min-w-0 break-all">Assignee: {request.assignee}</span><span>Updated: {formatDate(request.updatedAt)}</span>
        </div>
        <div className="hidden flex-wrap gap-x-4 text-xs text-text-muted md:flex">
          <span className="min-w-0 break-all">Requester: {request.requester}</span><span className="min-w-0 break-all">Flow: {request.flow}</span>
        </div>
      </li>)}
    </ul>
  </div>;
}
