import api from "../lib/api";

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
  title: string;
  status: string;
  assignee: string;
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
  title?: string;
  statusid?: string;
  status?: string;
  assignee?: string | null;
  assignee_name?: string | null;
  flow?: string;
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
  return {
    id: result.humanid ?? result.requestid ?? "-",
    title: result.title ?? "Untitled request",
    status: result.status ?? result.statusid ?? "-",
    assignee: result.assignee_name ?? result.assignee ?? "-",
    flow: result.flow_name ?? result.flow ?? "-",
    tags: result.tags ?? [],
    updatedAt: result.updated_at ?? "",
    snippet: result.snippet ?? result.highlight ?? "",
  };
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
  const response = await api.get<SearchResponseDto | SearchResultDto[]>("/requests/search/", {
    params: buildSearchParams(filters),
  });
  const results = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return {
    results: results.map(normalizeSearchResult),
    count: Array.isArray(response.data) ? results.length : response.data.count ?? results.length,
  };
}

export function filterLocalSearchResults(
  results: RequestSearchResult[],
  filters: RequestSearchFilters,
): RequestSearchResponse {
  const query = filters.query.trim().toLowerCase();
  const filtered = results.filter((result) => {
    const haystack = [
      result.id,
      result.title,
      result.status,
      result.assignee,
      result.flow,
      result.tags.join(" "),
      result.snippet,
    ]
      .join(" ")
      .toLowerCase();
    const updatedTime = Date.parse(result.updatedAt);
    const fromTime = filters.updatedFrom ? Date.parse(filters.updatedFrom) : Number.NEGATIVE_INFINITY;
    const toTime = filters.updatedTo ? Date.parse(`${filters.updatedTo}T23:59:59`) : Number.POSITIVE_INFINITY;

    return (
      (!query || haystack.includes(query)) &&
      (filters.status.length === 0 || filters.status.includes(result.status)) &&
      (filters.assignee.length === 0 || filters.assignee.includes(result.assignee)) &&
      (filters.flow.length === 0 || filters.flow.includes(result.flow)) &&
      (filters.tag.length === 0 || filters.tag.some((tag) => result.tags.includes(tag))) &&
      (Number.isNaN(updatedTime) || (updatedTime >= fromTime && updatedTime <= toTime))
    );
  });

  const start = (filters.page - 1) * filters.pageSize;
  return {
    results: filtered.slice(start, start + filters.pageSize),
    count: filtered.length,
  };
}
