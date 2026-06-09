export type CurrentUserProfile = {
  displayName: string;
  email: string;
  employeeCode: string;
  username: string;
};

type JwtClaims = {
  display_name?: string;
  name?: string;
  email?: string;
  employee_code?: string;
  employeeCode?: string;
  preferred_username?: string;
  username?: string;
  sub?: string;
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return window.atob(padded);
}

function readJwtClaims(token: string | null): JwtClaims {
  if (!token) return {};
  const [, payload] = token.split(".");
  if (!payload) return {};

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtClaims;
  } catch {
    return {};
  }
}

export function getCurrentUserProfile(token: string | null): CurrentUserProfile {
  const claims = readJwtClaims(token);
  const email = claims.email ?? "";
  const username = claims.preferred_username ?? claims.username ?? claims.sub ?? "";

  return {
    displayName: claims.display_name ?? claims.name ?? email ?? username,
    email,
    employeeCode: claims.employee_code ?? claims.employeeCode ?? "",
    username,
  };
}
