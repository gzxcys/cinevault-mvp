import express from "express";
import { optionalAuth } from "../middleware/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_PROFILE = "https://image.tmdb.org/t/p/w185";
const API_KEY = process.env.TMDB_API_KEY;

// Хелпер запроса в TMDB
async function tmdbGet(path, params = {}) {
  if (!API_KEY) throw new Error("TMDB_API_KEY не задан");
  const qs = new URLSearchParams({
    ...params,
    api_key: API_KEY,
    language: "ru-RU",
  }).toString();
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  return res.json();
}

// Нормализация результатов поиска — единый формат для movie и tv
function normalizeSearchItem(item, type) {
  const dateStr = item.release_date || item.first_air_date || "";
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;
  return {
    tmdb_id: item.id,
    type: type, // 'movie' | 'series'
    title: item.title || item.name || "Без названия",
    original_title: item.original_title || item.original_name || null,
    year,
    poster_url: item.poster_path ? `${IMG_BASE}${item.poster_path}` : null,
    description: item.overview || null,
    tmdb_rating: item.vote_average || null,
    popularity: item.popularity || 0,
  };
}

// ============================================================
// GET /api/tmdb/search?q=...&type=multi|movie|tv
// Поиск по названию (фильмы + сериалы)
// ============================================================
router.get("/search", optionalAuth, async (req, res) => {
  const { q, type = "multi" } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ results: [] });
  }

  try {
    if (type === "multi") {
      // Параллельно ищем в фильмах и сериалах
      const [movies, tv] = await Promise.all([
        tmdbGet("/search/movie", { query: q, include_adult: "false" }),
        tmdbGet("/search/tv", { query: q, include_adult: "false" }),
      ]);

      const merged = [
        ...(movies.results || [])
          .slice(0, 10)
          .map((x) => normalizeSearchItem(x, "movie")),
        ...(tv.results || [])
          .slice(0, 10)
          .map((x) => normalizeSearchItem(x, "series")),
      ];

      // Сортируем по популярности — сверху самое известное
      merged.sort((a, b) => b.popularity - a.popularity);

      res.json({ results: merged.slice(0, 15) });
    } else {
      const endpoint = type === "tv" ? "/search/tv" : "/search/movie";
      const data = await tmdbGet(endpoint, {
        query: q,
        include_adult: "false",
      });
      const results = (data.results || [])
        .slice(0, 15)
        .map((x) => normalizeSearchItem(x, type === "tv" ? "series" : "movie"));
      res.json({ results });
    }
  } catch (err) {
    console.error("tmdb search error:", err.message);
    res.status(500).json({ error: "Ошибка поиска в TMDB: " + err.message });
  }
});

// ============================================================
// GET /api/tmdb/find-by-imdb/:imdb_id?type=movie|tv
// Поиск по IMDb ID (например tt0816692)
// ============================================================
router.get("/find-by-imdb/:imdb_id", optionalAuth, async (req, res) => {
  const imdbId = req.params.imdb_id.trim();
  if (!/^tt\d{5,}$/i.test(imdbId)) {
    return res
      .status(400)
      .json({ error: "Неверный формат IMDb ID (пример: tt0816692)" });
  }

  try {
    const data = await tmdbGet(`/find/${imdbId}`, {
      external_source: "imdb_id",
    });

    const movie = data.movie_results?.[0];
    const tv = data.tv_results?.[0];

    if (!movie && !tv) {
      return res.status(404).json({ error: "Фильм с таким IMDb ID не найден" });
    }

    const primary = movie
      ? normalizeSearchItem(movie, "movie")
      : normalizeSearchItem(tv, "series");

    res.json({
      results: [primary], // единый формат с /search
      imdb_id: imdbId,
    });
  } catch (err) {
    console.error("tmdb find-by-imdb error:", err.message);
    res.status(500).json({ error: "Ошибка поиска по IMDb ID: " + err.message });
  }
});

// ============================================================
// GET /api/tmdb/details/:type/:id
// Полные детали фильма: жанры, актёры, режиссёр, длительность
// ============================================================
router.get("/details/:type/:id", optionalAuth, async (req, res) => {
  const { type, id } = req.params;
  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ error: "type должен быть movie или tv" });
  }

  try {
    const details = await tmdbGet(`/${type}/${id}`, {
      append_to_response: "credits,external_ids",
    });

    const crew = details.credits?.crew || [];
    const director =
      crew.find((c) => c.job === "Director")?.name ||
      details.created_by?.[0]?.name ||
      null;

    const cast = (details.credits?.cast || []).slice(0, 10).map((a) => ({
      tmdb_id: a.id,
      name: a.name,
      character: a.character,
      profile_url: a.profile_path ? `${IMG_PROFILE}${a.profile_path}` : null,
    }));

    const dateStr = details.release_date || details.first_air_date || "";
    const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;

    res.json({
      tmdb_id: details.id,
      type: type === "tv" ? "series" : "movie",
      title: details.title || details.name,
      original_title: details.original_title || details.original_name,
      year,
      director,
      runtime: details.runtime || details.episode_run_time?.[0] || null,
      poster_url: details.poster_path
        ? `${IMG_BASE}${details.poster_path}`
        : null,
      description: details.overview,
      tmdb_rating: details.vote_average,
      genres: (details.genres || []).map((g) => g.name),
      actors: cast,
      imdb_id: details.external_ids?.imdb_id || null,
    });
  } catch (err) {
    console.error("tmdb details error:", err.message);
    res.status(500).json({ error: "Ошибка получения деталей: " + err.message });
  }
});

export default router;
