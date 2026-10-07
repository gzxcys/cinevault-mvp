import express from "express";
import db from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

const DEMO_USER_ID = 1;

function getUserId(req) {
  return req.user?.id || DEMO_USER_ID;
}

// ============================================================
// GET /api/stats — аналитика библиотеки + напоминания
// ============================================================
router.get("/", optionalAuth, (req, res) => {
  const userId = getUserId(req);

  // ---- Основные счётчики ----
  const total = db
    .prepare("SELECT COUNT(*) AS c FROM user_films WHERE user_id = ?")
    .get(userId).c;

  const byStatus = db
    .prepare(
      `
    SELECT status, COUNT(*) AS count
    FROM user_films
    WHERE user_id = ?
    GROUP BY status
  `,
    )
    .all(userId);

  const bySource = db
    .prepare(
      `
    SELECT source_type, COUNT(*) AS count
    FROM user_films
    WHERE user_id = ?
    GROUP BY source_type
  `,
    )
    .all(userId);

  const byType = db
    .prepare(
      `
    SELECT f.type, COUNT(*) AS count
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
    GROUP BY f.type
  `,
    )
    .all(userId);

  const byGenre = db
    .prepare(
      `
    SELECT g.name AS genre, COUNT(DISTINCT f.id) AS count
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    JOIN film_genres fg ON fg.film_id = f.id
    JOIN genres g ON g.id = fg.genre_id
    WHERE uf.user_id = ?
    GROUP BY g.name
    ORDER BY count DESC
    LIMIT 10
  `,
    )
    .all(userId);

  const avgRating = db
    .prepare(
      `
    SELECT AVG(user_rating) AS avg
    FROM user_films
    WHERE user_id = ? AND user_rating IS NOT NULL
  `,
    )
    .get(userId).avg;

  const topDirectors = db
    .prepare(
      `
    SELECT f.director, COUNT(*) AS count
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ? AND f.director IS NOT NULL
    GROUP BY f.director
    ORDER BY count DESC
    LIMIT 5
  `,
    )
    .all(userId);

  const favoritesCount = db
    .prepare(
      `
    SELECT COUNT(*) AS c FROM user_films
    WHERE user_id = ? AND is_favorite = 1
  `,
    )
    .get(userId).c;

  // ============================================================
  // НАПОМИНАНИЯ
  // ============================================================

  // 1. Незавершённые сериалы — статус "Смотрю"
  const unfinishedSeries = db
    .prepare(
      `
    SELECT
      f.id, f.title, f.poster_url, f.year,
      uf.source_name, uf.updated_at,
      CAST((julianday('now') - julianday(uf.updated_at)) AS INTEGER) AS days_since
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
      AND f.type = 'series'
      AND uf.status = 'watching'
    ORDER BY days_since DESC, uf.updated_at DESC
    LIMIT 10
  `,
    )
    .all(userId);

  // 2. Забытые планы — planned, добавлены >21 дня назад
  const forgottenPlans = db
    .prepare(
      `
    SELECT
      f.id, f.title, f.poster_url, f.year, f.director,
      CAST((julianday('now') - julianday(uf.created_at)) AS INTEGER) AS days_since
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
      AND uf.status = 'planned'
      AND julianday('now') - julianday(uf.created_at) > 21
    ORDER BY uf.created_at ASC
    LIMIT 10
  `,
    )
    .all(userId);

  // 3. Начатые фильмы (не сериалы) в статусе "Смотрю" — забыл досмотреть
  const unfinishedMovies = db
    .prepare(
      `
    SELECT
      f.id, f.title, f.poster_url, f.year,
      CAST((julianday('now') - julianday(uf.updated_at)) AS INTEGER) AS days_since
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
      AND f.type = 'movie'
      AND uf.status = 'watching'
    ORDER BY days_since DESC
    LIMIT 10
  `,
    )
    .all(userId);

  // 4. Любимые, которые давно не пересматривал (>180 дней)
  const rewatchSuggestions = db
    .prepare(
      `
    SELECT
      f.id, f.title, f.poster_url, f.year, f.director,
      uf.user_rating,
      CAST((julianday('now') - julianday(uf.updated_at)) AS INTEGER) AS days_since
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
      AND uf.is_favorite = 1
      AND uf.status = 'watched'
      AND uf.user_rating >= 4
      AND julianday('now') - julianday(uf.updated_at) > 180
    ORDER BY uf.user_rating DESC, days_since DESC
    LIMIT 6
  `,
    )
    .all(userId);

  res.json({
    // Основное
    total,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
    bySource: Object.fromEntries(bySource.map((r) => [r.source_type, r.count])),
    byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
    byGenre,
    avgRating: avgRating ? Number(avgRating.toFixed(2)) : 0,
    topDirectors,
    favoritesCount,

    // Напоминания
    reminders: {
      unfinishedSeries,
      unfinishedMovies,
      forgottenPlans,
      rewatchSuggestions,
      totalCount:
        unfinishedSeries.length +
        unfinishedMovies.length +
        forgottenPlans.length +
        rewatchSuggestions.length,
    },
  });
});

export default router;
