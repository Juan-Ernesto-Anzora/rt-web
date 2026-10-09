import api from "../lib/api";
import type { FlowDto, StatusDto, UserDto } from "../api/requestDisplay";

export type CatalogOption = { id: string; label: string; category?: string };
type PageDto<T> = { count?: number; next?: string | null; results?: T[] };

function entries<T>(value: PageDto<T> | T[]) {
  return Array.isArray(value) ? value : value.results ?? [];
}

export async function listSearchFlows(): Promise<CatalogOption[]> {
  const all: CatalogOption[] = [];
  for (let page = 1; ; page++) {
    const response = await api.get<PageDto<FlowDto> | FlowDto[]>("/flows/", { params: { page, page_size: 100 } });
    const current = entries(response.data);
    all.push(...current.filter(item => item.flow_id).map(item => ({ id: item.flow_id!, label: item.name || "Flow unavailable" })));
    if (Array.isArray(response.data) || !response.data.next) break;
    if (!current.length) throw new Error("Could not load all flows.");
  }
  return all;
}

export async function listSearchStatuses(flowId: string): Promise<CatalogOption[]> {
  const response = await api.get<PageDto<StatusDto> | StatusDto[]>(`/flows/${encodeURIComponent(flowId)}/statuses/`);
  return entries(response.data).filter(item => item.status_id).map(item => ({ id: item.status_id!, label: item.name || "Status unavailable", category: item.category }));
}

export async function listSearchUsers(page: number, search: string) {
  const response = await api.get<PageDto<UserDto> | UserDto[]>("/users/", { params: { page, page_size: 25, ...(search ? { search } : {}) } });
  const users = entries(response.data).filter(item => item.user_id).map(item => ({ id: item.user_id!, label: item.display_name || item.email || "User unavailable" }));
  const hasNext = !Array.isArray(response.data) && Boolean(response.data.next);
  return { users, hasNext };
}
