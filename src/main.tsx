import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAdminPermission } from "./auth/adminPermissions";
import { AuthProvider, useAuth } from "./auth/useAuth";
import { ErrorState } from "./components/common/ErrorState";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import AppShell from "./components/layout/AppShell";
import "./index.css";
import App from "./pages/App";
import SearchView from "./pages/SearchView";
import AdminShellPage from "./pages/admin/AdminShellPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import Login from "./pages/Login";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePreferencesPage from "./pages/ProfilePreferencesPage";
import RequestCreatePage from "./pages/RequestCreatePage";
import RequestDetailPage from "./pages/RequestDetailPage";
import RouteErrorPage from "./pages/RouteErrorPage";

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
      <div className="p-6" role="status" aria-live="polite">
        <div className="text-sm font-semibold text-text-muted">Checking admin permissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([{
  path: "/",
  element: <Outlet />,
  errorElement: <RouteErrorPage />,
  children: [
  { path: "login", element: <Login /> },
  {
    element: <Protected><AppShell /></Protected>,
    children: [
      { index: true, element: <App /> },
      { path: "search", element: <SearchView /> },
      { path: "requests/new", element: <RequestCreatePage /> },
      { path: "requests/:id", element: <RequestDetailPage /> },
      { path: "profile/preferences", element: <ProfilePreferencesPage /> },
      { path: "403", element: <ForbiddenPage /> },
      { path: "admin/*", element: <AdminProtected><AdminShellPage /></AdminProtected> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
  ],
}]);

function Root() {
  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider><AuthProvider>
      <AppErrorBoundary><Root /></AppErrorBoundary>
    </AuthProvider></ThemeProvider>
  </React.StrictMode>,
);
