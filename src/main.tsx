import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAdminPermission } from "./auth/adminPermissions";
import { AuthProvider, useAuth } from "./auth/useAuth";
import { ErrorState } from "./components/common/ErrorState";
import "./index.css";
import App from "./pages/App";
import AdminShellPage from "./pages/admin/AdminShellPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import Login from "./pages/Login";
import ProfilePreferencesPage from "./pages/ProfilePreferencesPage";
import RequestCreatePage from "./pages/RequestCreatePage";
import RequestDetailPage from "./pages/RequestDetailPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { token, tenant } = useAuth();
  const { loading, allowed, error } = useAdminPermission(token, tenant);
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <div className="card p-5 text-sm font-semibold text-neutral-700">Checking admin permissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/search",
    element: (
      <Protected>
        <App initialView="search" />
      </Protected>
    ),
  },
  {
    path: "/requests/new",
    element: (
      <Protected>
        <RequestCreatePage />
      </Protected>
    ),
  },
  {
    path: "/requests/:id",
    element: (
      <Protected>
        <RequestDetailPage />
      </Protected>
    ),
  },
  {
    path: "/profile/preferences",
    element: (
      <Protected>
        <ProfilePreferencesPage />
      </Protected>
    ),
  },
  {
    path: "/403",
    element: (
      <Protected>
        <ForbiddenPage />
      </Protected>
    ),
  },
  {
    path: "/admin/*",
    element: (
      <AdminProtected>
        <AdminShellPage />
      </AdminProtected>
    ),
  },
  {
    path: "/",
    element: (
      <Protected>
        <App />
      </Protected>
    ),
  },
]);

function Root() {
  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>,
);
