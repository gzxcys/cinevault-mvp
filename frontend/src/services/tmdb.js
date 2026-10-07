// Клиент для /api/tmdb/* эндпоинтов нашего бэкенда.
// Токен авторизации подставляется автоматически из localStorage.

const BASE = "/api/tmdb";
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

/**
 * Поиск фильмов и сериалов по названию.
 * @param {string} query
 * @returns {Promise<{results: Array}>}
 */
export async function searchTmdb(query) {
  if (!query || query.trim().length < 2) return { results: [] };
  return request(`/search?q=${encodeURIComponent(query.trim())}`);
}

/**
 * Поиск по IMDb ID (формат tt1234567).
 * @param {string} imdbId
 * @returns {Promise<{results: Array}>}
 */
export async function findByImdb(imdbId) {
  const clean = imdbId.trim();
  return request(`/find-by-imdb/${encodeURIComponent(clean)}`);
}

/**
 * Детали фильма (жанры, актёры, режиссёр).
 * @param {'movie'|'tv'} type
 * @param {number} tmdbId
 * @returns {Promise<Object>}
 */
export async function getTmdbDetails(type, tmdbId) {
  return request(`/details/${type}/${tmdbId}`);
}
