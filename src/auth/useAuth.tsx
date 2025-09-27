import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setAuth } from "../lib/api";

type Tokens = { access: string; refresh?: string };

type AuthContextValue = {
  token: string | null;
  tenant: string | null;
  login(tokens: Tokens, tenantCode: string): void;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Unable to read localStorage", error);
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Unable to write localStorage", error);
  }
}

function removeLocalStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Unable to remove localStorage", error);
  }
}

function writeSessionStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn("Unable to write sessionStorage", error);
  }
}

function removeSessionStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn("Unable to remove sessionStorage", error);
  }
}

function useAuthController(): AuthContextValue {
  const [token, setToken] = useState<string | null>(() => readLocalStorage("access"));
  const [tenant, setTenant] = useState<string | null>(() => readLocalStorage("tenant"));

  useEffect(() => {
    setAuth(token, tenant);
  }, [token, tenant]);

  const login = useCallback(({ access, refresh }: Tokens, tenantCode: string) => {
    setToken(access);
    setTenant(tenantCode);
    setAuth(access, tenantCode);
    writeLocalStorage("access", access);
    writeLocalStorage("tenant", tenantCode);
    if (refresh) {
      writeSessionStorage("refresh", refresh);
    } else {
      removeSessionStorage("refresh");
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTenant(null);
    setAuth(null, null);
    removeLocalStorage("access");
    removeLocalStorage("tenant");
    removeSessionStorage("refresh");
  }, []);

  return useMemo(
    () => ({ token, tenant, login, logout }),
    [token, tenant, login, logout],
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthController();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export type { Tokens };