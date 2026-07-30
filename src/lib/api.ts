import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

// Estado en memoria (simple); luego podemos migrarlo a Zustand/Context.
let accessToken: string | null = null;
let tenantCode: string | null = null;

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setAuth(token: string | null, tenant: string | null) {
  accessToken = token;
  tenantCode = tenant;
}

api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = {} as import("axios").AxiosRequestHeaders;
  const token = accessToken ?? readLocalStorage("access");
  const tenant = tenantCode ?? readLocalStorage("tenant");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant) config.headers["X-Tenant"] = tenant;
  return config;
});

// 401 handler opcional para futuro “refresh”
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      // TODO: flujo refresh: llamar /api/auth/jwt/refresh si guardamos refresh token
      // Por ahora: limpiar y redirigir a /login
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
