import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "../auth/useAuth";
import {
  createRequestComment,
  listRequestComments,
  makeLocalComment,
  RequestComment,
  SelectedUpload,
} from "../features/requestActivity";
import {
  filterLocalSearchResults,
  RequestSearchFilters,
  RequestSearchResult,
  searchRequests,
  SearchFacetKey,
} from "../features/requestSearch";
import api from "../lib/api";

type RequestSummary = {
  requestid?: string;
  humanid?: string;
  title: string;
  statusid?: string;
  assignee?: string | null;
  updated_at?: string;
  priority?: string;
};

type RequestRow = {
  id: string;
  title: string;
  status: string;
  assignee: string;
  updated: string;
  priority: string;
};

type RequestsResponse = {
  results?: RequestSummary[];
};

type AppView = "tasks" | "search";

const NAV_ITEMS = [
  { id: "new", label: "New Request" },
  { id: "tasks", label: "My Tasks" },
  { id: "other", label: "Other Tasks" },
  { id: "requests", label: "My Requests" },
  { id: "search", label: "Search" },
  { id: "settings", label: "Settings" },
];

const EMPTY_SEARCH_FILTERS: RequestSearchFilters = {
  query: "",
  status: [],
  assignee: [],
  flow: [],
  tag: [],
  updatedFrom: "",
  updatedTo: "",
  page: 1,
  pageSize: 25,
  sort: "-updated_at",
};

const FALLBACK_REQUESTS: RequestSummary[] = [
  {
    humanid: "RT-2025-001001",
    title: "VPN not connecting",
    statusid: "Open",
    assignee: "Ana Gomez",
    updated_at: "2025-08-22T10:41:00Z",
    priority: "High",
  },
  {
    humanid: "RT-2025-001002",
    title: "Email quota exceeded",
    statusid: "In Progress",
    assignee: "Luis Perez",
    updated_at: "2025-08-22T09:18:00Z",
    priority: "Normal",
  },
  {
    humanid: "RT-2025-001003",
    title: "Printer F3 queue stuck",
    statusid: "Waiting",
    assignee: null,
    updated_at: "2025-08-21T17:02:00Z",
    priority: "Low",
  },
  {
    humanid: "RT-2025-001004",
    title: "VPN split tunneling",
    statusid: "Closed",
    assignee: "Ana Gomez",
    updated_at: "2025-08-20T15:27:00Z",
    priority: "Normal",
  },
];

const FALLBACK_COMMENTS: Record<string, RequestComment[]> = {
  "RT-2025-001001": [
    {
      id: "comment-001",
      authorName: "Ana Gomez",
      body: "Confirmed the VPN profile fails after password rotation. Waiting on network team review.",
      createdAt: "2025-08-22T11:20:00Z",
      attachments: [
        {
          id: "attachment-001",
          fileName: "vpn-error-screenshot.png",
          size: 248_120,
          contentType: "image/png",
          scanStatus: "clean",
        },
      ],
    },
  ],
  "RT-2025-001002": [
    {
      id: "comment-002",
      authorName: "Luis Perez",
      body: "Mailbox archive job was queued. I attached the quota report for audit.",
      createdAt: "2025-08-22T09:45:00Z",
      attachments: [
        {
          id: "attachment-002",
          fileName: "quota-report.csv",
          size: 18_420,
          contentType: "text/csv",
          scanStatus: "clean",
        },
      ],
    },
  ],
};

const FALLBACK_SEARCH_RESULTS: RequestSearchResult[] = [
  {
    id: "RT-2025-001001",
    title: "VPN not connecting",
    status: "Open",
    assignee: "Ana Gomez",
    flow: "IT Support",
    tags: ["vpn", "remote-access"],
    updatedAt: "2025-08-22T10:41:00Z",
    snippet: "User cannot connect after password rotation. VPN client reports invalid profile.",
  },
  {
    id: "RT-2025-001002",
    title: "Email quota exceeded",
    status: "In Progress",
    assignee: "Luis Perez",
    flow: "Messaging",
    tags: ["email", "quota"],
    updatedAt: "2025-08-22T09:18:00Z",
    snippet: "Mailbox archive job requested before increasing quota.",
  },
  {
    id: "RT-2025-001003",
    title: "Printer F3 queue stuck",
    status: "Waiting",
    assignee: "-",
    flow: "Facilities",
    tags: ["printer", "floor-3"],
    updatedAt: "2025-08-21T17:02:00Z",
    snippet: "Queue is blocked by a failed PDF job. Waiting for onsite confirmation.",
  },
  {
    id: "RT-2025-001004",
    title: "VPN split tunneling",
    status: "Closed",
    assignee: "Ana Gomez",
    flow: "IT Support",
    tags: ["vpn", "policy"],
    updatedAt: "2025-08-20T15:27:00Z",
    snippet: "Policy updated and confirmed with the requester.",
  },
  {
    id: "RT-2025-001005",
    title: "New hire access package",
    status: "Open",
    assignee: "Marta Ruiz",
    flow: "Access Management",
    tags: ["onboarding", "access"],
    updatedAt: "2025-08-19T13:10:00Z",
    snippet: "Manager requested CRM, finance dashboard, and building access.",
  },
];

function UserMenu({ onLogout }: { onLogout(): void }) {
  const menuItems = [
    "Profile & Preferences",
    "Keyboard Shortcuts",
    "Saved Views",
    "Notifications",
    "Switch Company/Tenant",
  ];

  return (
    <div className="absolute right-6 top-16 z-20 w-64 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
      {menuItems.map((label) => (
        <button
          key={label}
          type="button"
          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        Log out
      </button>
    </div>
  );
}

function TopBar({ tenant, onNew, onLogout }: { tenant?: string | null; onNew(): void; onLogout(): void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div className="text-lg font-semibold text-neutral-800">Request Tracker</div>
      <div className="relative flex items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          New Request
        </button>
        <div className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
          Tenant: {tenant ?? "-"}
        </div>
        <button
          type="button"
          className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <div className="h-8 w-8 rounded-full bg-primary-600" />
          <span className="text-sm font-medium text-neutral-800">Ana Gomez</span>
        </button>
        {open && <UserMenu onLogout={onLogout} />}
      </div>
    </header>
  );
}

function SideNav({ activeView, onNavigate }: { activeView: AppView; onNavigate(view: AppView): void }) {
  return (
    <aside className="w-60 border-r border-neutral-200 bg-neutral-50 p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeView || (activeView === "tasks" && item.id === "tasks");
        const targetView: AppView | null = item.id === "search" ? "search" : item.id === "tasks" ? "tasks" : null;
        return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            if (targetView) onNavigate(targetView);
          }}
          className={`mb-1 w-full px-4 py-2 text-left text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
            isActive
              ? "rounded-lg bg-primary-600 font-semibold text-white"
              : "rounded-lg hover:bg-neutral-100"
          }`}
        >
          {item.label}
        </button>
        );
      })}
    </aside>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (Number.isNaN(Date.parse(value))) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("waiting")) return "bg-warning-500/15 text-neutral-900";
  if (normalized.includes("closed")) return "bg-neutral-200 text-neutral-700";
  return "bg-primary-50 text-primary-700";
}

function RequestsTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: RequestRow[];
  selectedId: string;
  onSelect(row: RequestRow): void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_116px_132px_110px_82px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-600">
        <div>ID</div>
        <div>Title</div>
        <div>Status</div>
        <div>Assignee</div>
        <div>Updated</div>
        <div>Priority</div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        {rows.map((row) => (
          <button
            key={`${row.id}-${row.title}`}
            type="button"
            onClick={() => onSelect(row)}
            className={`grid min-h-12 w-full grid-cols-[120px_1fr_116px_132px_110px_82px] items-center px-4 text-left text-sm hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
              selectedId === row.id ? "bg-primary-50" : "bg-white"
            }`}
          >
            <div className="font-semibold text-neutral-800">{row.id}</div>
            <div className="truncate pr-4 text-neutral-900">{row.title}</div>
            <div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                {row.status}
              </span>
            </div>
            <div className="truncate pr-4 text-neutral-700">{row.assignee}</div>
            <div className="text-neutral-700">{row.updated}</div>
            <div className="text-neutral-700">{row.priority}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachmentList({ comment }: { comment: RequestComment }) {
  if (comment.attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {comment.attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-800">{attachment.fileName}</div>
            <div className="text-xs text-neutral-600">
              {formatFileSize(attachment.size)}
              {attachment.scanStatus ? ` - scan ${attachment.scanStatus}` : ""}
            </div>
          </div>
          {attachment.downloadUrl && (
            <a
              href={attachment.downloadUrl}
              className="ml-3 text-sm font-semibold text-primary-700 hover:text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              Open
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function CommentComposer({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit(body: string, uploads: SelectedUpload[]): Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [uploads, setUploads] = useState<SelectedUpload[]>([]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setUploads((current) => [
      ...current,
      ...files.map((file) => ({ file, localId: crypto.randomUUID() })),
    ]);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody && uploads.length === 0) return;
    await onSubmit(trimmedBody, uploads);
    setBody("");
    setUploads([]);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-neutral-200 pt-4">
      <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="comment-body">
        Comment
      </label>
      <textarea
        id="comment-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-24 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
        placeholder="Add an update for the requester"
        disabled={busy}
      />

      {uploads.length > 0 && (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-xs font-semibold uppercase text-neutral-600">Upload batch</div>
          <div className="mt-2 space-y-2">
            {uploads.map((upload) => (
              <div key={upload.localId} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-neutral-800">{upload.file.name}</div>
                  <div className="text-xs text-neutral-600">{formatFileSize(upload.file.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploads((current) => current.filter((item) => item.localId !== upload.localId))}
                  className="rounded px-2 py-1 text-sm font-semibold text-danger-500 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-within:outline focus-within:outline-2 focus-within:outline-primary-600">
          Attach files
          <input type="file" multiple className="sr-only" onChange={handleFiles} disabled={busy} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Posting" : "Post comment"}
        </button>
      </div>
    </form>
  );
}

function RequestActivityPanel({
  selected,
  comments,
  loading,
  error,
  posting,
  onSubmit,
}: {
  selected: RequestRow;
  comments: RequestComment[];
  loading: boolean;
  error: string | null;
  posting: boolean;
  onSubmit(body: string, uploads: SelectedUpload[]): Promise<void>;
}) {
  return (
    <section className="card flex min-h-[520px] flex-col p-4">
      <div className="border-b border-neutral-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-500">{selected.id}</div>
            <h2 className="mt-1 text-lg font-semibold text-neutral-900">{selected.title}</h2>
          </div>
          <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${statusClass(selected.status)}`}>
            {selected.status}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-semibold text-neutral-500">Assignee</div>
            <div className="text-neutral-900">{selected.assignee}</div>
          </div>
          <div>
            <div className="font-semibold text-neutral-500">Priority</div>
            <div className="text-neutral-900">{selected.priority}</div>
          </div>
          <div>
            <div className="font-semibold text-neutral-500">Updated</div>
            <div className="text-neutral-900">{selected.updated}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4">
        {loading && <div className="text-sm text-neutral-500">Loading comments...</div>}
        {error && !loading && (
          <div className="mb-3 rounded-lg border border-danger-500 bg-white px-3 py-2 text-sm text-danger-500">
            {error}
          </div>
        )}
        {!loading && comments.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            No comments yet. Add the first update or upload supporting files.
          </div>
        )}
        {!loading && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-neutral-900">{comment.authorName}</div>
                  <time className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</time>
                </div>
                {comment.body && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{comment.body}</p>}
                <AttachmentList comment={comment} />
              </article>
            ))}
          </div>
        )}
      </div>

      <CommentComposer busy={posting} onSubmit={onSubmit} />
    </section>
  );
}

function uniqueFacetValues(results: RequestSearchResult[], key: SearchFacetKey) {
  const values = new Set<string>();
  results.forEach((result) => {
    if (key === "tag") {
      result.tags.forEach((tag) => values.add(tag));
      return;
    }
    values.add(result[key]);
  });
  return Array.from(values).filter(Boolean).sort();
}

function FacetGroup({
  title,
  facetKey,
  values,
  selected,
  onToggle,
}: {
  title: string;
  facetKey: SearchFacetKey;
  values: string[];
  selected: string[];
  onToggle(facetKey: SearchFacetKey, value: string): void;
}) {
  return (
    <fieldset className="border-t border-neutral-200 pt-4">
      <legend className="text-sm font-semibold text-neutral-800">{title}</legend>
      <div className="mt-2 space-y-2">
        {values.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(facetKey, value)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SearchResultsTable({ results }: { results: RequestSearchResult[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[130px_1fr_112px_132px_130px_116px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-600">
        <div>ID</div>
        <div>Request</div>
        <div>Status</div>
        <div>Assignee</div>
        <div>Flow</div>
        <div>Updated</div>
      </div>
      <div>
        {results.map((result) => (
          <div
            key={result.id}
            className="grid min-h-12 grid-cols-[130px_1fr_112px_132px_130px_116px] items-center border-b border-neutral-100 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-primary-50"
          >
            <div className="font-semibold text-neutral-800">{result.id}</div>
            <div className="min-w-0 pr-4">
              <div className="truncate font-semibold text-neutral-900">{result.title}</div>
              <div className="mt-1 truncate text-xs text-neutral-600">{result.snippet}</div>
              {result.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.tags.map((tag) => (
                    <span key={tag} className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(result.status)}`}>
                {result.status}
              </span>
            </div>
            <div className="truncate pr-4 text-neutral-700">{result.assignee}</div>
            <div className="truncate pr-4 text-neutral-700">{result.flow}</div>
            <div className="text-neutral-700">{result.updatedAt ? formatDate(result.updatedAt) : "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchView() {
  const [filters, setFilters] = useState<RequestSearchFilters>(EMPTY_SEARCH_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<RequestSearchFilters>(EMPTY_SEARCH_FILTERS);
  const [results, setResults] = useState<RequestSearchResult[]>(FALLBACK_SEARCH_RESULTS);
  const [count, setCount] = useState(FALLBACK_SEARCH_RESULTS.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facetSource = results.length > 0 ? results : FALLBACK_SEARCH_RESULTS;
  const statusValues = uniqueFacetValues(FALLBACK_SEARCH_RESULTS, "status");
  const assigneeValues = uniqueFacetValues(facetSource, "assignee");
  const flowValues = uniqueFacetValues(facetSource, "flow");
  const tagValues = uniqueFacetValues(facetSource, "tag");
  const totalPages = Math.max(1, Math.ceil(count / filters.pageSize));

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setLoading(true);
      try {
        const response = await searchRequests(submittedFilters);
        if (cancelled) return;
        setResults(response.results);
        setCount(response.count);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        const localResponse = filterLocalSearchResults(FALLBACK_SEARCH_RESULTS, submittedFilters);
        setResults(localResponse.results);
        setCount(localResponse.count);
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        setError(axiosError.response?.data?.detail ?? "Showing local search data; API search is unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [submittedFilters]);

  function updateFilter<K extends keyof RequestSearchFilters>(key: K, value: RequestSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? current.page : 1 }));
  }

  function toggleFacet(key: SearchFacetKey, value: string) {
    setFilters((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [key]: nextValues, page: 1 };
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_SEARCH_FILTERS);
    setSubmittedFilters(EMPTY_SEARCH_FILTERS);
  }

  function goToPage(page: number) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Search Requests</h1>
          <p className="mt-1 text-sm text-neutral-600">Search open and closed requests from one place.</p>
        </div>
        <div className="text-sm font-semibold text-neutral-600">{count} results</div>
      </div>

      <form onSubmit={submitSearch} className="card p-4">
        <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="search-query">
          Keyword
        </label>
        <div className="flex gap-3">
          <input
            id="search-query"
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            className="h-11 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            placeholder="Search title, id, tags, assignee, comments"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside className="card space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="updated-from">
              Updated from
            </label>
            <input
              id="updated-from"
              type="date"
              value={filters.updatedFrom}
              onChange={(event) => updateFilter("updatedFrom", event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="updated-to">
              Updated to
            </label>
            <input
              id="updated-to"
              type="date"
              value={filters.updatedTo}
              onChange={(event) => updateFilter("updatedTo", event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            />
          </div>

          <FacetGroup
            title="Status"
            facetKey="status"
            values={statusValues}
            selected={filters.status}
            onToggle={toggleFacet}
          />
          <FacetGroup
            title="Assignee"
            facetKey="assignee"
            values={assigneeValues}
            selected={filters.assignee}
            onToggle={toggleFacet}
          />
          <FacetGroup title="Flow" facetKey="flow" values={flowValues} selected={filters.flow} onToggle={toggleFacet} />
          <FacetGroup title="Tag" facetKey="tag" values={tagValues} selected={filters.tag} onToggle={toggleFacet} />
        </aside>

        <div className="space-y-3">
          {loading && <div className="text-sm text-neutral-500">Searching requests...</div>}
          {error && !loading && (
            <div className="rounded-lg border border-warning-500 bg-white px-4 py-3 text-sm text-neutral-800">
              {error}
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="card border-dashed p-6 text-sm text-neutral-600">
              No requests matched the current search and facets.
            </div>
          )}
          {!loading && results.length > 0 && <SearchResultsTable results={results} />}
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <div>
              Page {filters.page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, filters.page - 1))}
                disabled={filters.page <= 1}
                className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, filters.page + 1))}
                disabled={filters.page >= totalPages}
                className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const { tenant, logout } = useAuth();
  const [activeView, setActiveView] = useState<AppView>("tasks");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [commentsByRequest, setCommentsByRequest] = useState<Record<string, RequestComment[]>>(FALLBACK_COMMENTS);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      if (!tenant) return;
      setLoading(true);
      try {
        const response = await api.get<RequestsResponse>("/requests/");
        if (cancelled) return;
        setRequests(response.data.results ?? []);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        const detail = axiosError.response?.data?.detail;
        setError(detail ?? "Failed to load requests");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const rows = useMemo(() => {
    const source = requests.length > 0 ? requests : FALLBACK_REQUESTS;
    return source.map((request) => ({
      id: request.humanid ?? request.requestid ?? "-",
      title: request.title,
      status: request.statusid ?? "-",
      assignee: request.assignee ?? "-",
      updated: request.updated_at ? formatDate(request.updated_at) : "-",
      priority: request.priority ?? "-",
    }));
  }, [requests]);

  useEffect(() => {
    if (!selectedId && rows.length > 0) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      if (!tenant || !selectedId) return;
      setCommentsLoading(true);
      try {
        const comments = await listRequestComments(selectedId);
        if (cancelled) return;
        setCommentsByRequest((current) => ({ ...current, [selectedId]: comments }));
        setCommentsError(null);
      } catch (requestError) {
        if (cancelled) return;
        const axiosError = requestError as AxiosError<{ detail?: string }>;
        const detail = axiosError.response?.data?.detail;
        setCommentsError(FALLBACK_COMMENTS[selectedId]?.length ? null : detail ?? "Comments are unavailable");
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [selectedId, tenant]);

  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const selectedComments = selected ? commentsByRequest[selected.id] ?? [] : [];

  async function handleSubmitComment(body: string, uploads: SelectedUpload[]) {
    if (!selected) return;
    const files = uploads.map((upload) => upload.file);
    setPosting(true);
    try {
      const comment = await createRequestComment(selected.id, body, files);
      setCommentsByRequest((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), comment],
      }));
      setCommentsError(null);
    } catch (requestError) {
      const localComment = makeLocalComment(body, files);
      setCommentsByRequest((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), localComment],
      }));

      const axiosError = requestError as AxiosError<{ detail?: string }>;
      const detail = axiosError.response?.data?.detail;
      setCommentsError(detail ?? "Saved locally for demo; API upload is unavailable");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <TopBar tenant={tenant} onNew={() => alert("New Request")} onLogout={logout} />
      <div className="flex flex-1">
        <SideNav activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 space-y-4 p-6">
          {activeView === "tasks" && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <KPI label="Open" value="24" />
                <KPI label="In Progress" value="12" />
                <KPI label="Due Today" value="5" />
                <KPI label="Overdue" value="3" />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView("search")}
                  className="card h-11 w-[520px] px-3 text-left text-sm text-neutral-500 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                >
                  Search tickets...
                </button>
                <button type="button" className="card h-11 px-4 text-sm font-semibold">
                  Saved Views
                </button>
                <button type="button" className="btn btn-primary">
                  New Request
                </button>
              </div>

              {loading && <div className="text-sm text-neutral-500">Loading requests...</div>}
              {error && !loading && (
                <div className="rounded-lg border border-danger-500 bg-white px-4 py-3 text-sm text-danger-500">
                  {error}
                </div>
              )}

              {selected && (
                <div className="grid grid-cols-[minmax(620px,1fr)_420px] gap-4">
                  <RequestsTable rows={rows} selectedId={selected.id} onSelect={(row) => setSelectedId(row.id)} />
                  <RequestActivityPanel
                    selected={selected}
                    comments={selectedComments}
                    loading={commentsLoading}
                    error={commentsError}
                    posting={posting}
                    onSubmit={handleSubmitComment}
                  />
                </div>
              )}
            </>
          )}
          {activeView === "search" && <SearchView />}
        </main>
      </div>
    </div>
  );
}
