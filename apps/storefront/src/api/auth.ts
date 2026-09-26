const TOKEN_KEY = "autodrive_access_token";
const USER_KEY = "autodrive_user";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

const base = import.meta.env.VITE_API_BASE ?? "/api";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistAuth(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string; message?: string }).message ?? (body as { error?: string }).error ?? `auth_failed_${res.status}`);
  }
  return body as T;
}

export const authApi = {
  register: (payload: { email: string; password: string; fullName: string; phone?: string }) =>
    authFetch<AuthResponse>("/storefront/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    authFetch<AuthResponse>("/storefront/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => authFetch<{ user: AuthUser }>("/storefront/auth/me"),
  logout: () => authFetch<{ ok: boolean }>("/storefront/auth/logout", { method: "POST" }),
};
