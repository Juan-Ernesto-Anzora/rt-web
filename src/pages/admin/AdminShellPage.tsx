import { useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";

type AdminSectionKey = "overview" | "workflows" | "users" | "roles";

const ADMIN_SECTIONS: Array<{
  key: AdminSectionKey;
  label: string;
  path: string;
  title: string;
  body: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    path: "/admin",
    title: "Configuration overview",
    body: "Review tenant configuration areas and continue with workflow, user, and role setup during Sprint 3.",
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
];

function sectionFromPath(pathname: string) {
  if (pathname === "/admin") return ADMIN_SECTIONS[0];
  return ADMIN_SECTIONS.find((section) => pathname === section.path);
}

export default function AdminShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeSection = useMemo(() => sectionFromPath(location.pathname), [location.pathname]);

  if (!activeSection) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Back to Home
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
        <p className="mt-1 text-sm text-neutral-600">Tenant configuration and permission-aware administration.</p>
      </header>

      <main className="grid grid-cols-[260px_minmax(0,1fr)] gap-4 p-6">
        <aside className="card h-fit p-3">
          <nav aria-label="Admin navigation" className="space-y-1">
            {ADMIN_SECTIONS.map((section) => {
              const isActive = section.key === activeSection.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => navigate(section.path)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
                    isActive ? "bg-primary-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="card p-5">
          <h2 className="text-lg font-semibold text-neutral-900">{activeSection.title}</h2>
          <p className="mt-2 text-sm text-neutral-700">{activeSection.body}</p>
          <div className="mt-4">
            <EmptyState
              title={`${activeSection.label} setup pending.`}
              body="This shell is ready for the next Sprint 3 configuration milestone."
            />
          </div>
        </section>
      </main>
    </div>
  );
}
