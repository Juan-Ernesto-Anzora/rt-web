import api from "../lib/api";
import { getRequestDetail } from "../api/requestDetail";
import {
  displayAssignee,
  displayFlow,
  displayStatus,
  displayUser,
  statusCategory,
  type FlowDto,
  type StatusDto,
  type UserDto,
} from "../api/requestDisplay";

export type SearchFacetKey = "status" | "assignee" | "flow" | "tag";

export type RequestSearchFilters = {
  query: string;
  status: string[];
  assignee: string[];
  flow: string[];
  tag: string[];
  updatedFrom: string;
  updatedTo: string;
  page: number;
  pageSize: number;
  sort: string;
};

export type RequestSearchResult = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  statusCategory?: string;
  assignee: string;
  requester: string;
  flow: string;
  tags: string[];
  updatedAt: string;
  snippet: string;
};

export type RequestSearchResponse = {
  results: RequestSearchResult[];
  count: number;
};

type SearchResultDto = {
  requestid?: string;
  humanid?: string;
  request_id?: string;
  human_id?: string;
  title?: string;
  statusid?: string;
  status_id?: string;
  status_name?: string;
  status_category?: string;
  status?: string | StatusDto | null;
  assignee_id?: string | null;
  assignee?: string | UserDto | null;
  assignee_name?: string | null;
  requester?: string | UserDto | null;
  requester_name?: string | null;
  flow?: string | FlowDto | null;
  flow_name?: string;
  tags?: string[];
  updated_at?: string;
  snippet?: string;
  highlight?: string;
};

type SearchResponseDto = {
  results?: SearchResultDto[];
  count?: number;
};

function normalizeSearchResult(result: SearchResultDto): RequestSearchResult {
  const requestId = result.request_id ?? "";
  return {
    id: (result.human_id ?? result.humanid ?? requestId) || result.requestid || "-",
    requestId,
    title: result.title ?? "Untitled request",
    status: displayStatus(result.status, result.status_name ?? result.status_category ?? result.statusid ?? result.status_id),
    statusCategory: statusCategory(result.status, result.status_category),
    assignee: displayAssignee(result.assignee, result.assignee_name),
    requester: displayUser(result.requester, result.requester_name),
    flow: displayFlow(result.flow, result.flow_name),
    tags: result.tags ?? [],
    updatedAt: result.updated_at ?? "",
    snippet: result.snippet ?? result.highlight ?? "",
  };
}

async function enrichSearchResultsWithDetail(results: RequestSearchResult[]) {
  return Promise.all(
    results.map(async (result) => {
      if (!result.requestId) return result;
      try {
        const detail = await getRequestDetail(result.requestId);
        return {
          ...result,
          title: detail.title,
          status: detail.status,
          statusCategory: detail.statusCategory,
          assignee: detail.assignee,
          requester: detail.requester,
          flow: detail.flow,
          updatedAt: detail.updatedAt || result.updatedAt,
          snippet: result.snippet || detail.description,
        };
      } catch {
        return result;
      }
    }),
  );
}

function appendListParam(params: URLSearchParams, key: string, values: string[]) {
  values.forEach((value) => {
    if (value) params.append(key, value);
  });
}

export function buildSearchParams(filters: RequestSearchFilters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  appendListParam(params, "status", filters.status);
  appendListParam(params, "assignee", filters.assignee);
  appendListParam(params, "flow", filters.flow);
  appendListParam(params, "tag", filters.tag);
  if (filters.updatedFrom) params.set("updated_from", filters.updatedFrom);
  if (filters.updatedTo) params.set("updated_to", filters.updatedTo);
  params.set("page", String(filters.page));
  params.set("page_size", String(filters.pageSize));
  params.set("sort", filters.sort);
  return params;
}

export async function searchRequests(filters: RequestSearchFilters): Promise<RequestSearchResponse> {
  const response = await api.get<SearchResponseDto | SearchResultDto[]>("/search/requests", {
    params: buildSearchParams(filters),
  });
  const results = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  const normalizedResults = results.map(normalizeSearchResult);
  return {
    results: await enrichSearchResultsWithDetail(normalizedResults),
    count: Array.isArray(response.data) ? results.length : response.data.count ?? results.length,
  };
}
