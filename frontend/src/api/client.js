/*
  Thin wrapper around fetch — not axios, because this app makes a handful
  of calls and doesn't need interceptors/etc. Centralizing here means the
  base URL and auth header logic live in one place, not copy-pasted into
  every component.
*/
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("jurisynth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (email, password) =>
    request("/auth/signup", { method: "POST", body: { email, password }, auth: false }),

  login: (email, password, totp_code) =>
    request("/auth/login", { method: "POST", body: { email, password, totp_code }, auth: false }),

  enrollMfa: () => request("/auth/mfa/enroll", { method: "POST" }),
  verifyMfa: (totp_code) => request("/auth/mfa/verify", { method: "POST", body: { totp_code } }),

  listCases: () => request("/cases"),
  createCase: (title, body_text) => request("/cases", { method: "POST", body: { title, body_text } }),
  searchCases: (q) => request(`/cases/search?q=${encodeURIComponent(q)}`),
  relatedCases: (caseId) => request(`/cases/${caseId}/related`),
  summarizeCase: (caseId) => request(`/cases/${caseId}/summarize`, { method: "POST" }),
  askCase: (caseId, question) => request(`/cases/${caseId}/ask`, { method: "POST", body: { question } }),

  scoreRisk: (payload) => request("/risk/score", { method: "POST", body: payload }),
};
