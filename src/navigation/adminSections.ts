type AdminSectionKey = "overview" | "workflows" | "users" | "roles" | "reports" | "sla" | "settings" | "audit";

export const ADMIN_SECTIONS: Array<{
  key: AdminSectionKey;
  label: string;
  path: string;
  title: string;
  body: string;
  permission?: string;
  anyPermissions?: string[];
}> = [
  {
    key: "overview",
    label: "Overview",
    path: "/admin",
    title: "Configuration overview",
    body: "Tenant configuration and permissions.",
  },
  {
    key: "workflows",
    label: "Workflows",
    path: "/admin/workflows",
    title: "Workflow configuration",
    body: "Workflow lists, statuses, and transitions will be managed here after the admin shell is stable.",
  },
  {
    key: "users",
    label: "Users",
    path: "/admin/users",
    title: "Users and memberships",
    body: "Tenant users and memberships will appear here after the user management milestone.",
  },
  {
    key: "roles",
    label: "Roles & Permissions",
    path: "/admin/roles",
    title: "Role and permission matrix",
    body: "Role assignments and permission review will appear here after the role matrix milestone.",
  },
  {
    key: "reports",
    label: "Reports",
    path: "/admin/reports",
    title: "Request reports",
    body: "Review tenant request metrics and export the filtered request dataset.",
    permission: "reports.read",
  },
  {
    key: "sla",
    label: "SLA Policies",
    path: "/admin/sla",
    title: "SLA policies",
    body: "Configure tenant response and resolution targets by priority.",
    permission: "sla.manage",
  },
  {
    key: "settings",
    label: "Settings",
    path: "/admin/settings",
    title: "Tenant settings",
    body: "Manage tenant defaults, feature flags, and notification templates.",
    anyPermissions: ["admin.settings", "featureflags.manage", "notifications.manage"],
  },
  {
    key: "audit",
    label: "Audit",
    path: "/admin/audit",
    title: "Tenant audit",
    body: "Review tenant administration and request activity history.",
    permission: "admin.audit.read",
  },
];

export function sectionFromPath(pathname: string) {
  if (pathname === "/admin") return ADMIN_SECTIONS[0];
  return ADMIN_SECTIONS.find((section) => pathname === section.path);
}
