import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../db.js";
import { signToken, generateVerificationToken } from "../utils/jwt.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/mailer.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EDITABLE_FIELDS = [
  "name",
  "full_name",
  "workplace",
  "bio",
  "city",
  "website",
  "telegram",
  "instagram",
];

function publicUser(userId) {
  return db
    .prepare(
      `
    SELECT
      id, email, name, full_name, avatar_url,
      workplace, bio, city, website, telegram, instagram,
      email_verified, is_admin, created_at, updated_at
    FROM users WHERE id = ?
  `,
    )
    .get(userId);
}

// ============================================================
// POST /api/auth/register
// ============================================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Заполни email, пароль и имя" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Некорректный email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Пароль минимум 6 символов" });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: "Имя минимум 2 символа" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: "Такой email уже зарегистрирован" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const verificationToken = generateVerificationToken();

    const info = db
      .prepare(
        `
      INSERT INTO users (email, password_hash, name, email_verified, verification_token)
      VALUES (?, ?, ?, 0, ?)
    `,
      )
      .run(normalizedEmail, passwordHash, name.trim(), verificationToken);

    const userId = info.lastInsertRowid;

    let emailSent = true;
    try {
      await sendVerificationEmail(
        normalizedEmail,
        name.trim(),
        verificationToken,
      );
    } catch (mailErr) {
      emailSent = false;
      console.error("❌ Не удалось отправить письмо:", mailErr.message);
    }

    res.status(201).json({
      message: emailSent
        ? "Аккаунт создан. Проверь почту и подтверди email."
        : "Аккаунт создан, но письмо не отправилось.",
      emailSent,
      userId,
      ...(process.env.NODE_ENV === "development" && { verificationToken }),
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Ошибка сервера при регистрации" });
  }
});

// ============================================================
// GET /api/auth/verify-email?token=...
// ============================================================
router.get("/verify-email", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Токен не передан" });

  const user = db
    .prepare(
      "SELECT id, email, email_verified FROM users WHERE verification_token = ?",
    )
    .get(token);

  if (!user)
    return res.status(400).json({ error: "Невалидный токен подтверждения" });

  if (user.email_verified) {
    return res.json({ message: "Email уже подтверждён", email: user.email });
  }

  db.prepare(
    "UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?",
  ).run(user.id);

  res.json({ message: "Email подтверждён!", email: user.email });
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Введи email и пароль" });
    }

    const user = db
      .prepare(
        "SELECT id, email, name, password_hash, email_verified FROM users WHERE email = ?",
      )
      .get(email.toLowerCase().trim());

    if (!user)
      return res.status(401).json({ error: "Неверный email или пароль" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: "Неверный email или пароль" });

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Email не подтверждён. Проверь почту.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const token = signToken({ id: user.id, email: user.email });

    res.json({
      token,
      user: publicUser(user.id),
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Ошибка сервера при входе" });
  }
});

// ============================================================
// GET /api/auth/me
// ============================================================
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user.id) });
});

// ============================================================
// PATCH /api/auth/me — обновление профиля
// ============================================================
router.patch("/me", requireAuth, (req, res) => {
  try {
    const updates = {};
    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) {
        const val = req.body[key];
        updates[key] =
          typeof val === "string" && val.trim() === "" ? null : val;
      }
    }

    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length < 2) {
        return res.status(400).json({ error: "Имя минимум 2 символа" });
      }
      updates.name = updates.name.trim();
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
      id: req.user.id,
    });

    res.json({ user: publicUser(req.user.id) });
  } catch (err) {
    console.error("patch /me error:", err);
    res.status(500).json({ error: "Не удалось обновить профиль" });
  }
});

// ============================================================
// POST /api/auth/avatar
// ============================================================
router.post("/avatar", requireAuth, (req, res) => {
  try {
    const { avatar } = req.body || {};
    if (!avatar || typeof avatar !== "string") {
      return res.status(400).json({ error: "Не передан аватар" });
    }
    if (!avatar.startsWith("data:image/")) {
      return res.status(400).json({ error: "Неверный формат изображения" });
    }
    const sizeInBytes = Math.ceil((avatar.length * 3) / 4);
    const MAX_SIZE = 2 * 1024 * 1024;
    if (sizeInBytes > MAX_SIZE) {
      return res.status(413).json({
        error: `Аватар слишком большой (${(sizeInBytes / 1024 / 1024).toFixed(2)} МБ). Максимум 2 МБ.`,
      });
    }
    const validPrefixes = [
      "data:image/jpeg",
      "data:image/png",
      "data:image/webp",
    ];
    if (!validPrefixes.some((p) => avatar.startsWith(p))) {
      return res
        .status(400)
        .json({ error: "Допустимы только JPEG, PNG, WebP" });
    }

    db.prepare(
      "UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?",
    ).run(avatar, new Date().toISOString(), req.user.id);

    res.json({ user: publicUser(req.user.id) });
  } catch (err) {
    console.error("avatar upload error:", err);
    res.status(500).json({ error: "Не удалось сохранить аватар" });
  }
});

// ============================================================
// DELETE /api/auth/avatar
// ============================================================
router.delete("/avatar", requireAuth, (req, res) => {
  db.prepare(
    "UPDATE users SET avatar_url = NULL, updated_at = ? WHERE id = ?",
  ).run(new Date().toISOString(), req.user.id);
  res.json({ user: publicUser(req.user.id) });
});

// ============================================================
// POST /api/auth/resend-verification
// ============================================================
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Укажи email" });

    const user = db
      .prepare(
        "SELECT id, email, name, email_verified FROM users WHERE email = ?",
      )
      .get(email.toLowerCase().trim());

    if (!user) {
      return res.json({
        message: "Если аккаунт существует — письмо отправлено.",
      });
    }
    if (user.email_verified) {
      return res.status(400).json({ error: "Email уже подтверждён" });
    }

    const newToken = generateVerificationToken();
    db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(
      newToken,
      user.id,
    );

    try {
      await sendVerificationEmail(user.email, user.name, newToken);
    } catch (mailErr) {
      console.error("❌ resend mail error:", mailErr.message);
      return res.status(500).json({ error: "Не удалось отправить письмо" });
    }

    res.json({ message: "Письмо отправлено повторно." });
  } catch (err) {
    console.error("resend error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================================================
// POST /api/auth/forgot-password — запрос сброса пароля
// ============================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Укажи email" });
    }

    const user = db
      .prepare(
        "SELECT id, email, name, email_verified FROM users WHERE email = ?",
      )
      .get(email.toLowerCase().trim());

    // Всегда отвечаем одинаково — не палим, существует ли аккаунт
    const genericResponse = {
      message:
        "Если такой email зарегистрирован, мы отправили ссылку для сброса пароля.",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Генерим токен + срок действия (1 час)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(
      "UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?",
    ).run(resetToken, resetExpires, user.id);

    let emailSent = true;
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (mailErr) {
      emailSent = false;
      console.error("❌ reset mail error:", mailErr.message);
    }

    res.json({
      ...genericResponse,
      emailSent,
      // В dev-режиме возвращаем токен, чтобы можно было тестировать без почты
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================================================
// GET /api/auth/check-reset-token?token=... — проверка токена
// ============================================================
router.get("/check-reset-token", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Токен не передан" });

  const user = db
    .prepare("SELECT id, email, reset_expires FROM users WHERE reset_token = ?")
    .get(token);

  if (!user) {
    return res.status(400).json({ valid: false, error: "Невалидная ссылка" });
  }

  if (new Date(user.reset_expires) < new Date()) {
    return res.status(400).json({ valid: false, error: "Ссылка просрочена" });
  }

  res.json({ valid: true, email: user.email });
});

// ============================================================
// POST /api/auth/reset-password — установка нового пароля
// ============================================================
router.post("/reset-password", (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Токен и новый пароль обязательны" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Пароль минимум 6 символов" });
    }

    const user = db
      .prepare(
        "SELECT id, email, reset_expires FROM users WHERE reset_token = ?",
      )
      .get(token);

    if (!user) {
      return res
        .status(400)
        .json({ error: "Невалидная или просроченная ссылка" });
    }

    if (new Date(user.reset_expires) < new Date()) {
      return res
        .status(400)
        .json({ error: "Ссылка просрочена. Запроси новую." });
    }

    const hash = bcrypt.hashSync(newPassword, 10);

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?,
          reset_token = NULL,
          reset_expires = NULL,
          updated_at = ?
      WHERE id = ?
    `,
    ).run(hash, new Date().toISOString(), user.id);

    res.json({ message: "Пароль успешно изменён. Теперь можно войти." });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
