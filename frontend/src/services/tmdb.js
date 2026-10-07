import { API_URL } from "../config.js";

const BASE = `${API_URL}/tmdb`;
const TOKEN_KEY = "cinevault_token";

async function request(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers });

  if (res.status === 401) {
    const err = await res.json().catch(() => ({}));
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

  return res.json();
}

export async function searchTmdb(query) {
  if (!query || query.trim().length < 2) return { results: [] };
  return request(`/search?q=${encodeURIComponent(query.trim())}`);
}

export async function findByImdb(imdbId) {
  const clean = imdbId.trim();
  return request(`/find-by-imdb/${encodeURIComponent(clean)}`);
}

export async function getTmdbDetails(type, tmdbId) {
  return request(`/details/${type}/${tmdbId}`);
}
