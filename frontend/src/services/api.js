const BASE = "/api";
const TOKEN_KEY = "cinevault_token";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const err = await res.json().catch(() => ({ error: "Unauthorized" }));
    if (token) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new Error(err.error || "Требуется авторизация");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------- Фильмы ----------
export async function getFilms(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return request(`/films${qs ? `?${qs}` : ""}`);
}

export async function getFilm(id) {
  return request(`/films/${id}`);
}

export async function getFilmProviders(id) {
  return request(`/films/${id}/providers`);
}

export async function createFilm(film) {
  return request("/films", { method: "POST", body: JSON.stringify(film) });
}

export async function updateFilm(id, updates) {
  return request(`/films/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteFilm(id) {
  return request(`/films/${id}`, { method: "DELETE" });
}

// ---------- Статистика ----------
export async function getStats() {
  return request("/stats");
}

// ---------- Рекомендации ----------
export async function getRecommendations(limit = 20) {
  return request(`/recommendations?limit=${limit}`);
}

// ---------- АДМИН ----------
export async function adminGetStats() {
  return request("/admin/stats");
}

export async function adminGetUsers() {
  return request("/admin/users");
}

export async function adminUpdateUser(id, updates) {
  return request(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function adminResetPassword(id, newPassword) {
  return request(`/admin/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

export async function adminResendVerify(id) {
  return request(`/admin/users/${id}/resend-verify`, { method: "POST" });
}

export async function adminDeleteUser(id) {
  return request(`/admin/users/${id}`, { method: "DELETE" });
}
export async function adminGetFilms(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  return request(`/admin/films?${qs.toString()}`);
}

export async function adminDeleteFilm(id) {
  return request(`/admin/films/${id}`, { method: "DELETE" });
}
