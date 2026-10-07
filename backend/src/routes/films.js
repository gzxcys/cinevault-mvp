import express from "express";
import db from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

const DEMO_USER_ID = 1;

function getUserId(req) {
  return req.user?.id || DEMO_USER_ID;
}

function parseGenres(raw) {
  if (!raw) return [];
  return raw
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeFilm(row) {
  if (!row) return null;
  return {
    ...row,
    genres: parseGenres(row.genres),
    tags: row.tags ? JSON.parse(row.tags) : [],
    is_favorite: Boolean(row.is_favorite),
  };
}

// Поля, которые юзер может менять в своей записи
const USER_FIELDS = [
  "status",
  "is_favorite",
  "source_type",
  "source_name",
  "user_rating",
  "tags",
];
// Поля, которые относятся к самому фильму (глобальные метаданные)
const FILM_FIELDS = [
  "title",
  "original_title",
  "year",
  "director",
  "description",
  "poster_url",
];

// ============================================================
// GET /api/films
// ============================================================
router.get("/", optionalAuth, (req, res) => {
  const userId = getUserId(req);
  const { search, status, source_type, type, genre, favorite, sort } =
    req.query;

  let sql = `
    SELECT
      f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
      f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
      uf.status, uf.is_favorite, uf.source_type, uf.source_name,
      uf.user_rating, uf.tags, uf.created_at, uf.updated_at,
      GROUP_CONCAT(g.name, '|') AS genres
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    WHERE uf.user_id = @userId
  `;
  const params = { userId };

  if (search) {
    sql += ` AND (
      LOWER(f.title) LIKE @search OR
      LOWER(f.original_title) LIKE @search OR
      LOWER(f.director) LIKE @search OR
      LOWER(uf.tags) LIKE @search OR
      EXISTS (
        SELECT 1 FROM film_genres fg2
        JOIN genres g2 ON g2.id = fg2.genre_id
        WHERE fg2.film_id = f.id AND LOWER(g2.name) LIKE @search
      )
    )`;
    params.search = `%${search.toLowerCase()}%`;
  }

  if (status) {
    sql += " AND uf.status = @status";
    params.status = status;
  }
  if (source_type) {
    sql += " AND uf.source_type = @source_type";
    params.source_type = source_type;
  }
  if (type) {
    sql += " AND f.type = @type";
    params.type = type;
  }
  if (favorite === "1" || favorite === "true") sql += " AND uf.is_favorite = 1";

  if (genre) {
    sql += ` AND EXISTS (
      SELECT 1 FROM film_genres fg3
      JOIN genres g3 ON g3.id = fg3.genre_id
      WHERE fg3.film_id = f.id AND g3.name = @genre
    )`;
    params.genre = genre;
  }

  sql += " GROUP BY f.id, uf.id";

  switch (sort) {
    case "year_desc":
      sql += " ORDER BY f.year DESC";
      break;
    case "year_asc":
      sql += " ORDER BY f.year ASC";
      break;
    case "rating":
      sql += " ORDER BY uf.user_rating DESC NULLS LAST";
      break;
    case "title":
      sql += " ORDER BY f.title ASC";
      break;
    default:
      sql += " ORDER BY uf.created_at DESC";
  }

  const rows = db.prepare(sql).all(params);
  res.json(rows.map(normalizeFilm));
});

// ============================================================
// GET /api/films/:id — один фильм + актёры + режиссёр
// ============================================================
router.get("/:id", optionalAuth, (req, res) => {
  const userId = getUserId(req);

  const film = db
    .prepare(
      `
    SELECT
      f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
      f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
      uf.status, uf.is_favorite, uf.source_type, uf.source_name,
      uf.user_rating, uf.tags, uf.created_at, uf.updated_at,
      GROUP_CONCAT(g.name, '|') AS genres
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    LEFT JOIN film_genres fg ON fg.film_id = f.id
    LEFT JOIN genres g ON g.id = fg.genre_id
    WHERE uf.user_id = ? AND f.id = ?
    GROUP BY f.id, uf.id
  `,
    )
    .get(userId, req.params.id);

  if (!film)
    return res.status(404).json({ error: "Фильм не найден в библиотеке" });

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
    .all(film.id);

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
    .all(film.id);

  res.json({
    ...normalizeFilm(film),
    actors,
    directors,
  });
});

// ============================================================
// POST /api/films — добавить фильм
// ============================================================
router.post("/", optionalAuth, async (req, res) => {
  const userId = getUserId(req);
  const {
    tmdb_id,
    title,
    original_title,
    year,
    director,
    genres,
    poster_url,
    description,
    type,
    status,
    source_type,
    source_name,
    user_rating,
    tags,
  } = req.body || {};

  if (!title)
    return res.status(400).json({ error: 'Поле "title" обязательно' });

  let finalPosterUrl = poster_url || null;

  if (!finalPosterUrl && tmdb_id && process.env.TMDB_API_KEY) {
    try {
      const tmdbType = (type || "movie") === "series" ? "tv" : "movie";
      const url = `https://api.themoviedb.org/3/${tmdbType}/${tmdb_id}?api_key=${process.env.TMDB_API_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        if (data.poster_path) {
          finalPosterUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        }
      }
    } catch (e) {
      console.warn("TMDB poster fetch failed:", e.message);
    }
  }

  try {
    const tx = db.transaction(() => {
      let film = null;
      if (tmdb_id) {
        film = db
          .prepare("SELECT id, poster_url FROM films WHERE tmdb_id = ?")
          .get(tmdb_id);
      }
      if (!film) {
        film = db
          .prepare(
            "SELECT id, poster_url FROM films WHERE title = ? AND year IS ?",
          )
          .get(title, year || null);
      }

      let filmId;
      if (film) {
        filmId = film.id;
        if (!film.poster_url && finalPosterUrl) {
          db.prepare("UPDATE films SET poster_url = ? WHERE id = ?").run(
            finalPosterUrl,
            filmId,
          );
        }
      } else {
        const info = db
          .prepare(
            `
          INSERT INTO films
            (tmdb_id, title, original_title, year, director, poster_url,
             description, type, runtime, tmdb_rating)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            tmdb_id || null,
            title,
            original_title || null,
            year || null,
            director || null,
            finalPosterUrl,
            description || null,
            type || "movie",
            null,
            null,
          );
        filmId = info.lastInsertRowid;
      }

      if (Array.isArray(genres) && genres.length > 0) {
        const insGenre = db.prepare(
          "INSERT OR IGNORE INTO genres (name) VALUES (?)",
        );
        const getGenre = db.prepare("SELECT id FROM genres WHERE name = ?");
        const linkGenre = db.prepare(
          "INSERT OR IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)",
        );
        for (const g of genres) {
          insGenre.run(g);
          const gid = getGenre.get(g).id;
          linkGenre.run(filmId, gid);
        }
      }

      const existing = db
        .prepare("SELECT id FROM user_films WHERE user_id = ? AND film_id = ?")
        .get(userId, filmId);

      if (existing) {
        throw new Error("Этот фильм уже в твоей библиотеке");
      }

      const uf = db
        .prepare(
          `
        INSERT INTO user_films
          (user_id, film_id, status, is_favorite, source_type,
           source_name, user_rating, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          userId,
          filmId,
          status || "planned",
          0,
          source_type || "streaming",
          source_name || null,
          user_rating || null,
          JSON.stringify(tags || []),
        );

      return db
        .prepare(
          `
        SELECT
          f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
          f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
          uf.status, uf.is_favorite, uf.source_type, uf.source_name,
          uf.user_rating, uf.tags, uf.created_at, uf.updated_at,
          GROUP_CONCAT(g.name, '|') AS genres
        FROM user_films uf
        JOIN films f ON f.id = uf.film_id
        LEFT JOIN film_genres fg ON fg.film_id = f.id
        LEFT JOIN genres g ON g.id = fg.genre_id
        WHERE uf.id = ?
        GROUP BY f.id, uf.id
      `,
        )
        .get(uf.lastInsertRowid);
    });

    const created = tx();
    res.status(201).json(normalizeFilm(created));
  } catch (err) {
    if (err.message.includes("уже в твоей библиотеке")) {
      return res.status(409).json({ error: err.message });
    }
    console.error("POST /films error:", err);
    res.status(500).json({ error: "Ошибка при добавлении фильма" });
  }
});

// ============================================================
// PATCH /api/films/:id — обновить (юзер-данные + метаданные фильма)
// ============================================================
router.patch("/:id", optionalAuth, (req, res) => {
  const userId = getUserId(req);
  const filmId = req.params.id;

  // Проверяем, что фильм есть в библиотеке юзера
  const inLibrary = db
    .prepare("SELECT id FROM user_films WHERE user_id = ? AND film_id = ?")
    .get(userId, filmId);

  if (!inLibrary) {
    return res.status(404).json({ error: "Фильм не найден в библиотеке" });
  }

  const body = req.body || {};

  // Собираем обновления для двух таблиц
  const userUpdates = {};
  const filmUpdates = {};
  let newGenres = null;

  for (const key of USER_FIELDS) {
    if (body[key] !== undefined) {
      if (key === "tags") {
        userUpdates.tags = JSON.stringify(body[key] || []);
      } else if (key === "is_favorite") {
        userUpdates.is_favorite = body[key] ? 1 : 0;
      } else {
        userUpdates[key] = body[key];
      }
    }
  }

  for (const key of FILM_FIELDS) {
    if (body[key] !== undefined) {
      const val = body[key];
      // Пустая строка → null (кроме title — он обязателен)
      if (key === "title") {
        if (!val || !val.trim()) {
          return res
            .status(400)
            .json({ error: "Название не может быть пустым" });
        }
        filmUpdates[key] = val.trim();
      } else if (typeof val === "string" && val.trim() === "") {
        filmUpdates[key] = null;
      } else {
        filmUpdates[key] = val;
      }
    }
  }

  if (Array.isArray(body.genres)) {
    newGenres = body.genres.map((g) => String(g).trim()).filter(Boolean);
  }

  const hasUserChanges = Object.keys(userUpdates).length > 0;
  const hasFilmChanges = Object.keys(filmUpdates).length > 0;
  const hasGenreChanges = newGenres !== null;

  if (!hasUserChanges && !hasFilmChanges && !hasGenreChanges) {
    return res.status(400).json({ error: "Нет полей для обновления" });
  }

  try {
    const tx = db.transaction(() => {
      // 1. Обновляем user_films
      if (hasUserChanges) {
        userUpdates.updated_at = new Date().toISOString();
        const setClause = Object.keys(userUpdates)
          .map((k) => `${k} = @${k}`)
          .join(", ");
        db.prepare(
          `UPDATE user_films SET ${setClause} WHERE user_id = @userId AND film_id = @filmId`,
        ).run({ ...userUpdates, userId, filmId });
      } else {
        // Даже если меняется только фильм — обновим updated_at в user_films,
        // чтобы напоминания пересчитались корректно
        db.prepare(
          "UPDATE user_films SET updated_at = ? WHERE user_id = ? AND film_id = ?",
        ).run(new Date().toISOString(), userId, filmId);
      }

      // 2. Обновляем films
      if (hasFilmChanges) {
        const setClause = Object.keys(filmUpdates)
          .map((k) => `${k} = @${k}`)
          .join(", ");
        db.prepare(`UPDATE films SET ${setClause} WHERE id = @filmId`).run({
          ...filmUpdates,
          filmId,
        });
      }

      // 3. Обновляем жанры (полная замена)
      if (hasGenreChanges) {
        db.prepare("DELETE FROM film_genres WHERE film_id = ?").run(filmId);

        if (newGenres.length > 0) {
          const insGenre = db.prepare(
            "INSERT OR IGNORE INTO genres (name) VALUES (?)",
          );
          const getGenre = db.prepare("SELECT id FROM genres WHERE name = ?");
          const linkGenre = db.prepare(
            "INSERT OR IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)",
          );
          for (const g of newGenres) {
            insGenre.run(g);
            const gid = getGenre.get(g).id;
            linkGenre.run(filmId, gid);
          }
        }
      }
    });

    tx();

    // Возвращаем обновлённый объект
    const updated = db
      .prepare(
        `
      SELECT
        f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
        f.poster_url, f.description, f.type, f.runtime, f.tmdb_rating,
        uf.status, uf.is_favorite, uf.source_type, uf.source_name,
        uf.user_rating, uf.tags, uf.created_at, uf.updated_at,
        GROUP_CONCAT(g.name, '|') AS genres
      FROM user_films uf
      JOIN films f ON f.id = uf.film_id
      LEFT JOIN film_genres fg ON fg.film_id = f.id
      LEFT JOIN genres g ON g.id = fg.genre_id
      WHERE uf.user_id = ? AND f.id = ?
      GROUP BY f.id, uf.id
    `,
      )
      .get(userId, filmId);

    res.json(normalizeFilm(updated));
  } catch (err) {
    console.error("PATCH /films error:", err);
    res.status(500).json({ error: "Не удалось обновить фильм" });
  }
});

// ============================================================
// DELETE /api/films/:id — убрать из библиотеки юзера
// ============================================================
router.delete("/:id", optionalAuth, (req, res) => {
  const userId = getUserId(req);
  const info = db
    .prepare("DELETE FROM user_films WHERE user_id = ? AND film_id = ?")
    .run(userId, req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Фильм не найден в библиотеке" });
  }
  res.status(204).end();
});

// ============================================================
// GET /api/films/:id/providers
// ============================================================
router.get("/:id/providers", optionalAuth, async (req, res) => {
  const userId = getUserId(req);

  const film = db
    .prepare(
      `
    SELECT f.id, f.tmdb_id, f.type
    FROM user_films uf
    JOIN films f ON f.id = uf.film_id
    WHERE uf.user_id = ? AND f.id = ?
  `,
    )
    .get(userId, req.params.id);

  if (!film) return res.status(404).json({ error: "Фильм не найден" });
  if (!film.tmdb_id)
    return res.json({ region: "RU", providers: [], message: "Нет tmdb_id" });
  if (!process.env.TMDB_API_KEY)
    return res.json({
      region: "RU",
      providers: [],
      message: "TMDB_API_KEY не задан",
    });

  try {
    const tmdbType = film.type === "series" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${tmdbType}/${film.tmdb_id}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok)
      return res.json({
        region: "RU",
        providers: [],
        message: `TMDB HTTP ${r.status}`,
      });

    const data = await r.json();
    const results = data.results || {};
    const region =
      (results.RU && "RU") ||
      (results.US && "US") ||
      Object.keys(results)[0] ||
      null;
    if (!region) return res.json({ region: null, providers: [] });

    const regionData = results[region] || {};
    const providers = [];

    for (const p of regionData.flatrate || [])
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        type: "subscription",
      });
    for (const p of regionData.free || [])
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        type: "free",
      });
    for (const p of regionData.ads || [])
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        type: "ads",
      });
    for (const p of regionData.rent || [])
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        type: "rent",
      });
    for (const p of regionData.buy || [])
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        type: "buy",
      });

    res.json({ region, link: regionData.link || null, providers });
  } catch (err) {
    console.error("providers error:", err.message);
    res.json({ region: "RU", providers: [], message: err.message });
  }
});

export default router;
