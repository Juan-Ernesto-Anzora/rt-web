import api from "../lib/api";
import {
  displayFlow, displayStatus, displayUser, statusCategory,
  type FlowDto, type StatusDto, type UserDto,
} from "../api/requestDisplay";

export type SearchState = {
  q: string;
  flowId: string;
  statusId: string;
  assigneeId: string;
  updatedFrom: string;
  updatedTo: string;
  page: number;
};

export const EMPTY_SEARCH: SearchState = {
  q: "", flowId: "", statusId: "", assigneeId: "",
  updatedFrom: "", updatedTo: "", page: 1,
};
export const SEARCH_PAGE_SIZE = 25;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_KEYS = new Set(["q", "flow_id", "status_id", "assignee_id", "updated_from", "updated_to", "page"]);

export function validPublicId(value: string) {
  return UUID.test(value);
}

export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validKeyword(value: string) {
  return value.length <= 200 && /[\p{L}\p{N}_]/u.test(value);
}

export function searchParamsFor(state: SearchState) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.flowId) params.set("flow_id", state.flowId);
  if (state.statusId) params.set("status_id", state.statusId);
  if (state.assigneeId) params.set("assignee_id", state.assigneeId);
  if (state.updatedFrom) params.set("updated_from", state.updatedFrom);
  if (state.updatedTo) params.set("updated_to", state.updatedTo);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function readSearchState(params: URLSearchParams) {
  const warnings: string[] = [];
  const state = { ...EMPTY_SEARCH };
  if ([...params.keys()].some(key => !URL_KEYS.has(key))) warnings.push("Unsupported Search parameters were removed.");
  const one = (key: string) => {
    const values = params.getAll(key);
    if (values.length > 1) { warnings.push(`Repeated ${key} filter was removed.`); return ""; }
    return values[0] ?? "";
  };
  const q = one("q").trim();
  if (q && validKeyword(q)) state.q = q;
  else if (q) warnings.push("Invalid search text was removed.");
  for (const [key, field] of [["flow_id", "flowId"], ["status_id", "statusId"], ["assignee_id", "assigneeId"]] as const) {
    const value = one(key);
    if (!value) continue;
    if (validPublicId(value)) state[field] = value.toLowerCase();
    else warnings.push(`Invalid ${key} filter was removed.`);
  }
  for (const [key, field] of [["updated_from", "updatedFrom"], ["updated_to", "updatedTo"]] as const) {
    const value = one(key);
    if (!value) continue;
    if (validDay(value)) state[field] = value;
    else warnings.push(`Invalid ${key} date was removed.`);
  }
  if (state.updatedFrom && state.updatedTo && state.updatedFrom > state.updatedTo) {
    state.updatedTo = "";
    warnings.push("The reversed updated-to date was removed.");
  }
  const rawPage = one("page");
  if (rawPage) {
    const page = Number(rawPage);
    if (/^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(page)) state.page = page;
    else warnings.push("Invalid page number was removed.");
  }
  return { state, warnings, canonical: searchParamsFor(state) };
}

export type RequestSearchResult = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  statusCategory?: string;
  priority: string;
  assignee: string;
  requester: string;
  flow: string;
  updatedAt: string;
  createdAt: string;
  rank: number;
  matchSources: Array<"request" | "comment" | "attachment">;
  matchContext?: string;
};

export type RequestSearchResponse = {
  count: number;
  page: number;
  pageSize: number;
  results: RequestSearchResult[];
};

type SearchResultDto = {
  request_id?: string;
  human_id?: string;
  title?: string;
  priority?: string;
  status?: StatusDto | null;
  status_name?: string;
  requester?: UserDto | null;
  assignee?: UserDto | null;
  assignee_id?: string | null;
  flow?: FlowDto | null;
  created_at?: string;
  updated_at?: string;
  rank?: number;
  match_sources?: string[];
};

type SearchResponseDto = {
  count: number;
  page: number;
  page_size: number;
  results: SearchResultDto[];
};

function normalizeResult(result: SearchResultDto): RequestSearchResult {
  const status = displayStatus(result.status, result.status_name);
  const requester = displayUser(result.requester);
  const flow = displayFlow(result.flow);
  const matchSources = (result.match_sources ?? []).filter(
    (source): source is "request" | "comment" | "attachment" =>
      source === "request" || source === "comment" || source === "attachment",
  );
  const extraSources = [matchSources.includes("comment") ? "comments" : "", matchSources.includes("attachment") ? "attachment names" : ""].filter(Boolean);
  return {
    id: result.human_id || "ID unavailable",
    requestId: result.request_id && validPublicId(result.request_id) ? result.request_id : "",
    title: result.title || "Untitled request",
    status: status === "-" ? "Status unavailable" : status,
    statusCategory: statusCategory(result.status),
    priority: result.priority ?? "-",
    assignee: result.assignee === null && !result.assignee_id ? "Unassigned" : displayUser(result.assignee, undefined, "Assignee unavailable"),
    requester: requester === "-" ? "Requester unavailable" : requester,
    flow: flow === "-" ? "Flow unavailable" : flow,
    createdAt: result.created_at ?? "",
    updatedAt: result.updated_at ?? "",
    rank: result.rank ?? 0,
    matchSources,
    matchContext: extraSources.length ? `Matched in ${extraSources.join(" and ")}` : undefined,
  };
}

export async function searchRequests(state: SearchState): Promise<RequestSearchResponse> {
  const params = searchParamsFor(state);
  params.set("page", String(state.page));
  params.set("page_size", String(SEARCH_PAGE_SIZE));
  const response = await api.get<SearchResponseDto>("/search/requests", { params });
  const data = response.data;
  if (!Array.isArray(data.results) || !Number.isInteger(data.count) || data.count < 0) {
    throw new Error("Search returned an invalid result envelope.");
  }
  return {
    count: data.count,
    page: data.page,
    pageSize: data.page_size,
    results: data.results.map(normalizeResult),
  };
}
