import axios from "axios";
import api from "../lib/api";

export type SettingValueType = "string" | "integer" | "boolean" | "url" | "timezone" | "email";

export type TenantSetting = {
  id: string;
  key: string;
  value: string | null;
  valueType: SettingValueType;
  isSensitive: boolean;
  hasValue: boolean;
  updatedAt: string;
};

export type SettingUpdate = {
  key: string;
  value: string | null;
  value_type: SettingValueType;
};

export type FeatureFlag = {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string;
};

export type NotificationTemplate = {
  id: string;
  eventType: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  updatedAt: string;
};

export type TemplateUpdate = {
  subject_template?: string;
  body_template?: string;
  is_active?: boolean;
};

export type ConfigurationApiError = {
  status?: number;
  code: string;
  message: string;
  details: Array<{ field: string; message: string }>;
};

type SettingDto = {
  setting_id?: string;
  key?: string;
  value?: unknown;
  value_type?: SettingValueType;
  is_sensitive?: boolean;
  has_value?: boolean;
  updated_at?: string;
};
type SettingsResponseDto = { settings?: SettingDto[] };
type FeatureFlagDto = {
  feature_flag_id?: string;
  key?: string;
  enabled?: boolean;
  description?: string | null;
  updated_at?: string;
};
type NotificationTemplateDto = {
  notification_template_id?: string;
  event_type?: string;
  subject_template?: string;
  body_template?: string;
  is_active?: boolean;
  updated_at?: string;
};

function scalarSettingValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function normalizeSetting(item: SettingDto): TenantSetting {
  const sensitive = Boolean(item.is_sensitive);
  return {
    id: item.setting_id ?? "",
    key: item.key ?? "",
    value: sensitive ? null : scalarSettingValue(item.value),
    valueType: item.value_type ?? "string",
    isSensitive: sensitive,
    hasValue: Boolean(item.has_value),
    updatedAt: item.updated_at ?? "",
  };
}

function normalizeFlag(item: FeatureFlagDto): FeatureFlag {
  return {
    id: item.feature_flag_id ?? "",
    key: item.key ?? "",
    enabled: Boolean(item.enabled),
    description: item.description ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

function normalizeTemplate(item: NotificationTemplateDto): NotificationTemplate {
  return {
    id: item.notification_template_id ?? "",
    eventType: item.event_type ?? "",
    subjectTemplate: item.subject_template ?? "",
    bodyTemplate: item.body_template ?? "",
    isActive: Boolean(item.is_active),
    updatedAt: item.updated_at ?? "",
  };
}

export function configurationApiError(error: unknown, fallback: string): ConfigurationApiError {
  if (!axios.isAxiosError(error)) return { code: "", message: fallback, details: [] };
  const status = error.response?.status;
  const data = error.response?.data;
  if (!data || typeof data !== "object") {
    return { status, code: "", message: status === 403 ? "You do not have permission for this settings section." : fallback, details: [] };
  }
  const body = data as { code?: unknown; message?: unknown; details?: unknown };
  const details = Array.isArray(body.details)
    ? body.details.flatMap((detail) => {
        if (!detail || typeof detail !== "object") return [];
        const item = detail as { field?: unknown; message?: unknown };
        return typeof item.message === "string"
          ? [{ field: typeof item.field === "string" ? item.field : "", message: item.message }]
          : [];
      })
    : [];
  return {
    status,
    code: typeof body.code === "string" ? body.code : "",
    message:
      status === 403
        ? "You do not have permission for this settings section."
        : typeof body.message === "string"
          ? body.message
          : fallback,
    details,
  };
}

export async function listTenantSettings() {
  const response = await api.get<SettingsResponseDto>("/admin/settings/");
  return (response.data.settings ?? []).map(normalizeSetting).filter((item) => item.key);
}

export async function saveTenantSettings(settings: SettingUpdate[]) {
  const response = await api.patch<SettingsResponseDto>("/admin/settings/", { settings });
  return (response.data.settings ?? []).map(normalizeSetting).filter((item) => item.key);
}

export async function listFeatureFlags() {
  const response = await api.get<FeatureFlagDto[]>("/admin/feature-flags/");
  return (response.data ?? []).map(normalizeFlag).filter((item) => item.key);
}

export async function saveFeatureFlag(key: string, enabled: boolean) {
  const response = await api.patch<FeatureFlagDto>(`/admin/feature-flags/${encodeURIComponent(key)}/`, { enabled });
  return normalizeFlag(response.data);
}

export async function listNotificationTemplates() {
  const response = await api.get<NotificationTemplateDto[]>("/admin/notification-templates/");
  return (response.data ?? []).map(normalizeTemplate).filter((item) => item.id && item.eventType);
}

export async function getNotificationTemplate(id: string) {
  const response = await api.get<NotificationTemplateDto>(`/admin/notification-templates/${encodeURIComponent(id)}/`);
  return normalizeTemplate(response.data);
}

export async function saveNotificationTemplate(id: string, payload: TemplateUpdate) {
  const response = await api.patch<NotificationTemplateDto>(
    `/admin/notification-templates/${encodeURIComponent(id)}/`,
    payload,
  );
  return normalizeTemplate(response.data);
}
