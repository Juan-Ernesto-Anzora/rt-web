import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { sectionFromPath } from "../../navigation/adminSections";
import AdminRolesPage from "./AdminRolesPage";
import AdminAuditPage from "./AdminAuditPage";
import AdminReportsPage from "./AdminReportsPage";
import AdminSettingsPage from "./AdminSettingsPage";
import AdminSlaPage from "./AdminSlaPage";
import AdminUsersPage from "./AdminUsersPage";
import WorkflowAdminPage from "./WorkflowAdminPage";


export default function AdminShellPage() {
  const location = useLocation();
  const activeSection = useMemo(() => sectionFromPath(location.pathname), [location.pathname]);

  if (!activeSection) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="legacy-page space-y-4 p-4 md:p-6">
      <header><h1 className="text-2xl font-semibold text-neutral-900">Admin</h1><p className="text-sm text-neutral-600">Tenant configuration and permission-aware administration.</p></header>
      <section className="min-w-0">
          {activeSection.key === "workflows" ? (
            <WorkflowAdminPage />
          ) : activeSection.key === "users" ? (
            <AdminUsersPage />
          ) : activeSection.key === "roles" ? (
            <AdminRolesPage />
          ) : activeSection.key === "reports" ? (
            <AdminReportsPage />
          ) : activeSection.key === "sla" ? (
            <AdminSlaPage />
          ) : activeSection.key === "settings" ? (
            <AdminSettingsPage />
          ) : activeSection.key === "audit" ? (
            <AdminAuditPage />
          ) : (
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-neutral-900">{activeSection.title}</h2>
              <p className="mt-2 text-sm text-neutral-700">{activeSection.body}</p>
              <div className="mt-4">
                <EmptyState
                  title={`${activeSection.label} setup pending.`}
                  body="This shell is ready for the next Sprint 3 configuration milestone."
                />
              </div>
            </div>
          )}
      </section>
    </div>
  );
}
