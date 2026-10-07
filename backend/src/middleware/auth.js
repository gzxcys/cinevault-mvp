import { verifyToken } from "../utils/jwt.js";
import db from "../db.js";

/**
 * Middleware: проверяет JWT, кладёт пользователя в req.user.
 * 401 — если токена нет или он невалидный.
 * 403 — если email не подтверждён.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);

    const user = db
      .prepare(
        "SELECT id, email, name, email_verified, is_admin FROM users WHERE id = ?",
      )
      .get(payload.userId);

    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Email не подтверждён",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Невалидный или просроченный токен" });
  }
}

/**
 * Optional auth — не падает, если токена нет.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = db
      .prepare(
        "SELECT id, email, name, email_verified, is_admin FROM users WHERE id = ?",
      )
      .get(payload.userId);
    if (user) req.user = user;
  } catch {
    // гость
  }
  next();
}

/**
 * Middleware: требует is_admin = 1.
 * Используется после requireAuth — чтобы req.user был уже установлен.
 */
export function requireAdmin(req, res, next) {
  // Если requireAuth не вызывался — проверим сами
  if (!req.user) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    try {
      const payload = verifyToken(header.slice(7));
      const user = db
        .prepare(
          "SELECT id, email, name, email_verified, is_admin FROM users WHERE id = ?",
        )
        .get(payload.userId);
      if (!user)
        return res.status(401).json({ error: "Пользователь не найден" });
      if (!user.email_verified) {
        return res
          .status(403)
          .json({ error: "Email не подтверждён", code: "EMAIL_NOT_VERIFIED" });
      }
      req.user = user;
    } catch {
      return res.status(401).json({ error: "Невалидный токен" });
    }
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Требуется доступ администратора" });
  }

  next();
}
