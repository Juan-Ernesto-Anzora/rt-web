import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/useAuth";
import "./index.css";
import App from "./pages/App";
import Login from "./pages/Login";
import RequestCreatePage from "./pages/RequestCreatePage";
import RequestDetailPage from "./pages/RequestDetailPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
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
