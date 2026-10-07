import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { generateVerificationToken } from "../utils/jwt.js";

const router = express.Router();

router.use(requireAdmin);

// ============================================================
// GET /api/admin/stats
// ============================================================
router.get("/stats", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  const verifiedUsers = db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE email_verified = 1")
    .get().c;
  const admins = db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1")
    .get().c;
  const totalFilms = db.prepare("SELECT COUNT(*) AS c FROM films").get().c;
  const totalUserFilms = db
    .prepare("SELECT COUNT(*) AS c FROM user_films")
    .get().c;

  res.json({
    totalUsers,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
    admins,
    totalFilms,
    totalUserFilms,
  });
});

// ============================================================
// GET /api/admin/users
// ============================================================
router.get("/users", (req, res) => {
  const users = db
    .prepare(
      `
    SELECT
      u.id, u.email, u.name, u.full_name, u.avatar_url,
      u.email_verified, u.is_admin, u.created_at,
      (SELECT COUNT(*) FROM user_films WHERE user_id = u.id) AS films_count,
      (SELECT COUNT(*) FROM user_films WHERE user_id = u.id AND status = 'watched') AS watched_count
    FROM users u
    ORDER BY u.id ASC
  `,
    )
    .all();

  res.json({ users });
});

// ============================================================
// GET /api/admin/films — глобальный каталог с поиском
// ============================================================
router.get("/films", (req, res) => {
  const { search, type, limit = 100, offset = 0 } = req.query;

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

  if (type) {
    where += " AND f.type = @type";
    params.type = type;
  }

  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM films f ${where}`)
    .get(params).c;

  const films = db
    .prepare(
      `
    SELECT
      f.id, f.tmdb_id, f.title, f.original_title, f.year, f.director,
      f.poster_url, f.type, f.tmdb_rating,
      (SELECT COUNT(*) FROM user_films WHERE film_id = f.id) AS users_count
    FROM films f
    ${where}
    ORDER BY f.id DESC
    LIMIT @limit OFFSET @offset
  `,
    )
    .all({
      ...params,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

  res.json({ films, total });
});

// ============================================================
// DELETE /api/admin/films/:id — удалить фильм из каталога
// (каскадно удалит его из всех коллекций)
// ============================================================
router.delete("/films/:id", (req, res) => {
  const filmId = parseInt(req.params.id, 10);
  const film = db
    .prepare("SELECT id, title FROM films WHERE id = ?")
    .get(filmId);
  if (!film) return res.status(404).json({ error: "Фильм не найден" });

  db.prepare("DELETE FROM films WHERE id = ?").run(filmId);
  res.json({ message: `«${film.title}» удалён`, changes: 1 });
});

// ============================================================
// PATCH /api/admin/users/:id
// ============================================================
router.patch("/users/:id", (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (!targetId) return res.status(400).json({ error: "Некорректный ID" });

  const target = db
    .prepare("SELECT id, email, is_admin FROM users WHERE id = ?")
    .get(targetId);
  if (!target) return res.status(404).json({ error: "Пользователь не найден" });

  if (targetId === req.user.id && req.body.is_admin === false) {
    return res.status(400).json({ error: "Нельзя снять админа с самого себя" });
  }

  const updates = {};

  if (typeof req.body.email_verified === "boolean") {
    updates.email_verified = req.body.email_verified ? 1 : 0;
    if (req.body.email_verified) updates.verification_token = null;
  }

  if (typeof req.body.is_admin === "boolean") {
    updates.is_admin = req.body.is_admin ? 1 : 0;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Нет полей для обновления" });
  }

  updates.updated_at = new Date().toISOString();

  const setClause = Object.keys(updates)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`).run({
    ...updates,
    id: targetId,
  });

  const updated = db
    .prepare(
      `
    SELECT id, email, name, full_name, email_verified, is_admin, created_at
    FROM users WHERE id = ?
  `,
    )
    .get(targetId);

  res.json({ user: updated });
});

// ============================================================
// POST /api/admin/users/:id/reset-password
// ============================================================
router.post("/users/:id/reset-password", (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Пароль минимум 6 символов" });
  }

  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(targetId);
  if (!target) return res.status(404).json({ error: "Пользователь не найден" });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
  ).run(hash, new Date().toISOString(), targetId);

  res.json({ message: "Пароль обновлён" });
});

// ============================================================
// POST /api/admin/users/:id/resend-verify
// ============================================================
router.post("/users/:id/resend-verify", (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const target = db
    .prepare("SELECT id, email, email_verified FROM users WHERE id = ?")
    .get(targetId);
  if (!target) return res.status(404).json({ error: "Пользователь не найден" });

  if (target.email_verified) {
    return res.status(400).json({ error: "Email уже подтверждён" });
  }

  const token = generateVerificationToken();
  db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(
    token,
    targetId,
  );

  res.json({
    message: "Токен сгенерирован",
    ...(process.env.NODE_ENV === "development" && {
      verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
    }),
  });
});

// ============================================================
// DELETE /api/admin/users/:id
// ============================================================
router.delete("/users/:id", (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: "Нельзя удалить самого себя" });
  }

  const target = db
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .get(targetId);
  if (!target) return res.status(404).json({ error: "Пользователь не найден" });

  db.prepare("DELETE FROM users WHERE id = ?").run(targetId);

  res.json({ message: `Пользователь ${target.email} удалён` });
});

export default router;
