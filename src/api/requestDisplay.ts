export type FlowDto = {
  flow_id?: string;
  name?: string;
  description?: string;
};

export type StatusDto = {
  status_id?: string;
  name?: string;
  category?: string;
  is_terminal?: boolean;
};

export type UserDto = {
  id?: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  employee_code?: string;
  avatar_url?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readableDisplay(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || UUID_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function displayFlow(flow?: string | FlowDto | null, fallback?: string | null) {
  if (typeof flow === "string") return readableDisplay(flow) ?? readableDisplay(fallback) ?? "-";
  return flow?.name ?? readableDisplay(fallback) ?? "-";
}

export function displayStatus(status?: string | StatusDto | null, fallback?: string | null) {
  if (typeof status === "string") return readableDisplay(status) ?? readableDisplay(fallback) ?? "-";
  return status?.name ?? status?.category ?? readableDisplay(fallback) ?? "-";
}

export function statusCategory(status?: string | StatusDto | null, fallback?: string | null) {
  if (!status || typeof status === "string") return readableDisplay(fallback);
  return status.category;
}

export function statusIsTerminal(status?: string | StatusDto | null) {
  return Boolean(status && typeof status !== "string" && status.is_terminal);
}

export function displayUser(user?: string | UserDto | null, fallback?: string | null, empty = "-") {
  if (typeof user === "string") return readableDisplay(user) ?? readableDisplay(fallback) ?? empty;
  return user?.display_name ?? user?.email ?? readableDisplay(fallback) ?? empty;
}

export function displayAssignee(user?: string | UserDto | null, fallback?: string | null) {
  return displayUser(user, fallback, "Unassigned");
}

export function userId(user?: string | UserDto | null, fallback?: string | null) {
  if (typeof user === "string") return fallback ?? null;
  return user?.user_id ?? user?.id ?? fallback ?? null;
}
