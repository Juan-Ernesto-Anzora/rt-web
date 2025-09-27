import { useState, useEffect } from "react";
import api, { setAuth } from "../lib/api";

type Tokens = { access: string; refresh?: string };

export function useAuthController() {
  // Inicializa desde localStorage/sessionStorage
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("access") || null);
  const [tenant, setTenant] = useState<string | null>(() => localStorage.getItem("tenant") || null);

  // Al montar, asegura que el interceptor tenga los valores
  useEffect(() => {
    setAuth(token, tenant);
  }, [token, tenant]);

  function loginLocal({ access, refresh }: Tokens, tenantCode: string) {
    setToken(access);
    setTenant(tenantCode);
    setAuth(access, tenantCode);
    localStorage.setItem("access", access);
    localStorage.setItem("tenant", tenantCode);
    if (refresh) sessionStorage.setItem("refresh", refresh);
  }

  function logout() {
    setToken(null);
    setTenant(null);
    setAuth(null, null);
    localStorage.removeItem("access");
    localStorage.removeItem("tenant");
    sessionStorage.removeItem("refresh");
  }

  return { token, tenant, loginLocal, logout };
}