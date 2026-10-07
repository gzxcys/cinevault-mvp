import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import filmsRouter from "./routes/films.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import recommendationsRouter from "./routes/recommendations.js";
import tmdbRouter from "./routes/tmdb.js";
import adminRouter from "./routes/admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// CORS — разрешаем фронту с GitHub Pages и локальной разработки
// ============================================================
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://gzxcys.github.io",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Запросы без origin (curl, Postman, мобильные приложения) — пропускаем
      if (!origin) return callback(null, true);
      // Запросы из whitelist
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Любые поддомены *.github.io (для preview-деплоев)
      if (origin.endsWith(".github.io")) return callback(null, true);
      // Fallback — для MVP разрешаем всё
      callback(null, true);
    },
    credentials: true,
  }),
);

// JSON body parser (увеличенный лимит для base64-аватаров)
app.use(express.json({ limit: "3mb" }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ============================================================
// Роуты
// ============================================================
app.use("/api/auth", authRouter);
app.use("/api/films", filmsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/tmdb", tmdbRouter);
app.use("/api/admin", adminRouter);

// Health-check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ============================================================
// Запуск
// ============================================================
const server = app.listen(PORT, () => {
  console.log(`🚀 CineVault API запущен: http://localhost:${PORT}`);
  console.log(`   Health-check: http://localhost:${PORT}/api/health`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Порт ${PORT} уже занят.`);
    console.error(`   Выполни: lsof -ti:${PORT} | xargs kill -9\n`);
    process.exit(1);
  } else {
    console.error("❌ Ошибка сервера:", err);
    process.exit(1);
  }
});
