import express from "express";
import db from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

const DEMO_USER_ID = 1;

function getUserId(req) {
  return req.user?.id || DEMO_USER_ID;
}

// ============================================================
// CONTENT-BASED: жанры + режиссёры любимых фильмов юзера
// ============================================================
function getFavoriteGenres(userId) {
  return db
    .prepare(
      `
    SELECT g.id, g.name, SUM(uf.user_rating) AS weight
    FROM user_films uf
    JOIN film_genres fg ON fg.film_id = uf.film_id
    JOIN genres g ON g.id = fg.genre_id
    WHERE uf.user_id = ? AND uf.user_rating >= 4
    GROUP BY g.id
    ORDER BY weight DESC
    LIMIT 5
  `,
    )
    .all(userId);
}

function getFavoriteDirectors(userId) {
  return db
    .prepare(
      `
    SELECT f.director AS name, SUM(uf.user_rating) AS weight
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ?
      AND uf.user_rating >= 4
      AND f.director IS NOT NULL
    GROUP BY f.director
    ORDER BY weight DESC
    LIMIT 5
  `,
    )
    .all(userId);
}

function getContentCandidates(userId, genreIds, directors, limit = 60) {
  if (genreIds.length === 0 && directors.length === 0) return [];

  const genrePlaceholders = genreIds.map(() => "?").join(",") || "NULL";
  const dirPlaceholders = directors.map(() => "?").join(",") || "NULL";

  return db
    .prepare(
      `
    SELECT
      f.id, f.title, f.original_title, f.year, f.poster_url,
      f.description, f.tmdb_rating, f.director, f.type,
      GROUP_CONCAT(DISTINCT g.name) AS genres,
      COUNT(DISTINCT CASE WHEN g.id IN (${genrePlaceholders}) THEN g.id END) AS genre_matches,
      CASE WHEN f.director IN (${dirPlaceholders}) THEN 1 ELSE 0 END AS director_match
    FROM films f
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    WHERE f.id NOT IN (
      SELECT film_id FROM user_films WHERE user_id = ?
    )
      AND (
        g.id IN (${genrePlaceholders})
        OR f.director IN (${dirPlaceholders})
      )
    GROUP BY f.id
    ORDER BY director_match DESC, genre_matches DESC, f.tmdb_rating DESC
    LIMIT ?
  `,
    )
    .all(
      ...genreIds, // для CASE WHEN g.id IN (...)
      ...directors, // для CASE WHEN f.director IN (...)
      userId, // для NOT IN
      ...genreIds, // для WHERE g.id IN (...)
      ...directors, // для WHERE f.director IN (...)
      limit,
    );
}

// ============================================================
// COLLABORATIVE: похожие юзеры
// ============================================================
function getSimilarUsers(userId, limit = 5) {
  return db
    .prepare(
      `
    SELECT
      other.user_id,
      COUNT(*) AS common_count,
      AVG(ABS(other.user_rating - mine.user_rating)) AS avg_diff
    FROM user_films mine
    JOIN user_films other
      ON other.film_id = mine.film_id
      AND other.user_id != mine.user_id
    WHERE mine.user_id = ?
      AND mine.user_rating IS NOT NULL
      AND other.user_rating IS NOT NULL
    GROUP BY other.user_id
    HAVING common_count >= 3
    ORDER BY avg_diff ASC, common_count DESC
    LIMIT ?
  `,
    )
    .all(userId, limit);
}

function getCollabCandidates(userId, similarUserIds, limit = 60) {
  if (similarUserIds.length === 0) return [];

  const placeholders = similarUserIds.map(() => "?").join(",");

  return db
    .prepare(
      `
    SELECT
      f.id, f.title, f.original_title, f.year, f.poster_url,
      f.description, f.tmdb_rating, f.director, f.type,
      GROUP_CONCAT(DISTINCT g.name) AS genres,
      AVG(uf.user_rating) AS avg_rating,
      COUNT(DISTINCT uf.user_id) AS users_count
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    WHERE uf.user_id IN (${placeholders})
      AND uf.user_rating >= 4
      AND f.id NOT IN (
        SELECT film_id FROM user_films WHERE user_id = ?
      )
    GROUP BY f.id
    ORDER BY avg_rating DESC, users_count DESC, f.tmdb_rating DESC
    LIMIT ?
  `,
    )
    .all(...similarUserIds, userId, limit);
}

// ============================================================
// MAIN
// ============================================================
router.get("/", optionalAuth, (req, res) => {
  const userId = getUserId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  try {
    // ─── 1. Что юзер любит ───
    const favGenres = getFavoriteGenres(userId);
    const favDirectors = getFavoriteDirectors(userId);

    // ─── 2. Content-based кандидаты ───
    const genreIds = favGenres.map((g) => g.id);
    const directorNames = favDirectors.map((d) => d.name);
    const contentCandidates = getContentCandidates(
      userId,
      genreIds,
      directorNames,
      80,
    );

    // ─── 3. Collaborative кандидаты ───
    const similarUsers = getSimilarUsers(userId, 5);
    const similarUserIds = similarUsers.map((u) => u.user_id);
    const collabCandidates = getCollabCandidates(userId, similarUserIds, 80);

    // ─── 4. Считаем итоговый score ───
    const scored = new Map();

    for (const c of contentCandidates) {
      const contentScore =
        (c.genre_matches || 0) * 2 + (c.director_match ? 3 : 0);
      scored.set(c.id, {
        ...c,
        content_score: contentScore,
        collab_score: 0,
        source: "content",
      });
    }

    const maxCollabUsers = Math.max(
      ...collabCandidates.map((c) => c.users_count || 1),
      1,
    );
    for (const c of collabCandidates) {
      const collabScore =
        (c.avg_rating || 0) * (c.users_count / maxCollabUsers);
      if (scored.has(c.id)) {
        scored.get(c.id).collab_score = collabScore;
        scored.get(c.id).source = "hybrid";
      } else {
        scored.set(c.id, {
          ...c,
          content_score: 0,
          collab_score: collabScore,
          source: "collaborative",
        });
      }
    }

    // ─── 5. Финальный score и сортировка ───
    const results = Array.from(scored.values())
      .map((c) => ({
        ...c,
        genres: c.genres ? c.genres.split("|") : [],
        final_score: 0.6 * c.content_score + 0.4 * c.collab_score * 5, // ×5 для сопоставимости шкал
      }))
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        title: c.title,
        original_title: c.original_title,
        year: c.year,
        poster_url: c.poster_url,
        description: c.description,
        tmdb_rating: c.tmdb_rating,
        director: c.director,
        type: c.type,
        genres: c.genres,
        source: c.source,
        reason:
          c.source === "hybrid"
            ? "Похожим пользователям и тебе нравится"
            : c.source === "collaborative"
              ? "Понравилось похожим пользователям"
              : "Основано на твоих любимых жанрах",
      }));

    res.json({
      basedOn: {
        favoriteGenres: favGenres.map((g) => g.name),
        favoriteDirectors: favDirectors.map((d) => d.name),
        similarUsersCount: similarUsers.length,
      },
      recommendations: results,
    });
  } catch (err) {
    console.error("recommendations error:", err);
    res.status(500).json({ error: "Ошибка при построении рекомендаций" });
  }
});

export default router;
