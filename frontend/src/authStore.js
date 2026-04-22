import { setAuthToken } from "./api";

const LS_KEY = "smartseason_auth";

export function loadAuth() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return { token: null, user: null };
    setAuthToken(parsed.token);
    return { token: parsed.token, user: parsed.user ?? null };
  } catch {
    return { token: null, user: null };
  }
}

export function saveAuth(auth) {
  localStorage.setItem(LS_KEY, JSON.stringify(auth));
  setAuthToken(auth?.token || null);
}

export function clearAuth() {
  localStorage.removeItem(LS_KEY);
  setAuthToken(null);
}

