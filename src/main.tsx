import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App'
import './index.css'
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Login from "./pages/Login";
// Update the import path to a relative path based on your project structure
import { useAuthController } from "./auth/useAuth";

// Provide a dummy onLogout function for the direct App render (if needed for legacy reasons)
createRoot(document.getElementById('root')!).render(<App />)

function Protected({ children }: { children: React.ReactNode }) {
  // para demo rápida: leemos del singleton axios (si setAuth tiene token) o levanta un estado global
  // Aquí mejor usar Context:
  const token = (window as any).__TOKEN__ as string | undefined; // temporal si no usas Context
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function Root() {
  const { token, loginLocal, logout } = useAuthController();

  // Exponer token en window para el Protected simple de arriba (temporal)
  (window as any).__TOKEN__ = token;

  const router = createBrowserRouter([
    {
      path: "/login",
      element: <Login onLoggedIn={(t, ten) => loginLocal(t, ten)} />,
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

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);