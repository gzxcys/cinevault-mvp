import express from "express";
import db from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// ============================================================
// GET /api/catalog — глобальный каталог всех фильмов
// ============================================================
router.get("/", optionalAuth, (req, res) => {
  const userId = req.user?.id || null;

  const {
    search,
    genre,
    type,
    year_from,
    year_to,
    sort,
    page = "1",
    limit = "60",
  } = req.query;

  const perPage = Math.min(parseInt(limit, 10) || 60, 100);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (currentPage - 1) * perPage;

  let where = "WHERE 1=1";
  const params = {};

  if (search) {
    where += ` AND (
      LOWER(f.title) LIKE @search OR
      LOWER(f.original_title) LIKE @search OR
      LOWER(f.director) LIKE @search
    )`;
    params.search = `%${search.toLowerCase()}%`;
  }

  if (genre) {
    where += ` AND EXISTS (
      SELECT 1 FROM film_genres fg
      JOIN genres g ON g.id = fg.genre_id
      WHERE fg.film_id = f.id AND g.name = @genre
    )`;
    params.genre = genre;
  }

  if (type) {
    where += " AND f.type = @type";
    params.type = type;
  }

  if (year_from) {
    where += " AND f.year >= @year_from";
    params.year_from = parseInt(year_from, 10);
  }

  if (year_to) {
    where += " AND f.year <= @year_to";
    params.year_to = parseInt(year_to, 10);
  }

  const total = db
    .prepare(
      `
    SELECT COUNT(*) AS c FROM films f ${where}
  `,
    )
    .get(params).c;

  let orderBy = "ORDER BY f.tmdb_rating DESC NULLS LAST";
  switch (sort) {
    case "rating":
      orderBy = "ORDER BY f.tmdb_rating DESC NULLS LAST";
      break;
    case "year_desc":
      orderBy = "ORDER BY f.year DESC NULLS LAST";
      break;
    case "year_asc":
      orderBy = "ORDER BY f.year ASC NULLS LAST";
      break;
    case "title":
      orderBy = "ORDER BY f.title ASC";
      break;
    default:
      orderBy = "ORDER BY f.tmdb_rating DESC NULLS LAST";
  }

  const films = db
    .prepare(
      `
    SELECT
      f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
      f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
      GROUP_CONCAT(g.name, '|') AS genres,
      CASE WHEN @userId IS NOT NULL AND EXISTS (
        SELECT 1 FROM user_films uf
        WHERE uf.user_id = @userId AND uf.film_id = f.id
      ) THEN 1 ELSE 0 END AS in_library
    FROM films f
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    ${where}
    GROUP BY f.id
    ${orderBy}
    LIMIT @limit OFFSET @offset
  `,
    )
    .all({ ...params, userId, limit: perPage, offset });

  const normalized = films.map((row) => ({
    ...row,
    genres: row.genres
      ? row.genres
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    in_library: Boolean(row.in_library),
  }));

  const allGenres = db
    .prepare(
      `
    SELECT g.name, COUNT(*) AS count
    FROM genres g
    JOIN film_genres fg ON fg.genre_id = g.id
    GROUP BY g.name
    ORDER BY count DESC
    LIMIT 25
  `,
    )
    .all();

  res.json({
    films: normalized,
    total,
    page: currentPage,
    limit: perPage,
    totalPages: Math.ceil(total / perPage),
    genres: allGenres,
  });
});

// ============================================================
// GET /api/catalog/:id — детали глобального фильма (актёры, режиссёр)
// ============================================================
router.get("/:id", optionalAuth, (req, res) => {
  const userId = req.user?.id || null;
  const filmId = req.params.id;

  const film = db
    .prepare(
      `
    SELECT
      f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
      f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
      GROUP_CONCAT(g.name, '|') AS genres,
      CASE WHEN @userId IS NOT NULL AND EXISTS (
        SELECT 1 FROM user_films uf
        WHERE uf.user_id = @userId AND uf.film_id = f.id
      ) THEN 1 ELSE 0 END AS in_library
    FROM films f
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    WHERE f.id = @filmId
    GROUP BY f.id
  `,
    )
    .get({ userId, filmId });

  if (!film)
    return res.status(404).json({ error: "Фильм не найден в каталоге" });

  // Актёры
  const actors = db
    .prepare(
      `
    SELECT p.id, p.name, p.profile_url, fp.character, fp.order_index
    FROM film_people fp
    JOIN people p ON p.id = fp.person_id
    WHERE fp.film_id = ? AND fp.role = 'actor'
    ORDER BY fp.order_index ASC
    LIMIT 20
  `,
    )
    .all(filmId);

  // Режиссёры
  const directors = db
    .prepare(
      `
    SELECT p.id, p.name, p.profile_url
    FROM film_people fp
    JOIN people p ON p.id = fp.person_id
    WHERE fp.film_id = ? AND fp.role = 'director'
    ORDER BY fp.order_index ASC
  `,
    )
    .all(filmId);

  res.json({
    ...film,
    genres: film.genres
      ? film.genres
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    in_library: Boolean(film.in_library),
    actors,
    directors,
  });
});

export default router;
