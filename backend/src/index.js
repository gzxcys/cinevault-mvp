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

app.use(cors());
app.use(express.json({ limit: "3mb" })); // запас для base64-аватаров

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/films", filmsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/tmdb", tmdbRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 CineVault API запущен: http://localhost:${PORT}`);
  console.log(`   Health-check: http://localhost:${PORT}/api/health`);
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
