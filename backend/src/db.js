import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || "./cinevault.db";
const dbPath = path.resolve(__dirname, "..", DB_PATH);

const db = new Database(dbPath);

// Производительность + целостность
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ============================================================
// UDF: регистронезависимая нормализация для кириллицы
// Встроенный SQLite LOWER() не всегда корректно работает с русскими буквами
// ============================================================
db.function("lower_ru", (str) => {
  if (str === null || str === undefined) return null;
  return String(str).toLowerCase();
});

// ============ СХЕМА БД ============

db.exec(`
  -- ===== Пользователи =====
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    workplace TEXT,
    bio TEXT,
    city TEXT,
    website TEXT,
    telegram TEXT,
    instagram TEXT,
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_token);
  CREATE INDEX IF NOT EXISTS idx_users_reset ON users(reset_token);

  -- ===== Глобальный каталог фильмов =====
  CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    original_title TEXT,
    year INTEGER,
    director TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    description TEXT,
    type TEXT DEFAULT 'movie',
    runtime INTEGER,
    tmdb_rating REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_films_title ON films(title);
  CREATE INDEX IF NOT EXISTS idx_films_year ON films(year);
  CREATE INDEX IF NOT EXISTS idx_films_director ON films(director);
  CREATE INDEX IF NOT EXISTS idx_films_tmdb ON films(tmdb_id);

  -- ===== Жанры =====
  CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    tmdb_id INTEGER UNIQUE
  );

  CREATE TABLE IF NOT EXISTS film_genres (
    film_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    PRIMARY KEY (film_id, genre_id),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
  );

  -- ===== Актёры и режиссёры =====
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    profile_url TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
  CREATE INDEX IF NOT EXISTS idx_people_tmdb ON people(tmdb_id);

  CREATE TABLE IF NOT EXISTS film_people (
    film_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    character TEXT,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (film_id, person_id, role),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_film_people_person ON film_people(person_id);

  -- ===== Личная библиотека пользователя =====
  CREATE TABLE IF NOT EXISTS user_films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    film_id INTEGER NOT NULL,
    status TEXT DEFAULT 'planned',
    is_favorite INTEGER DEFAULT 0,
    source_type TEXT DEFAULT 'streaming',
    source_name TEXT,
    user_rating INTEGER,
    tags TEXT,
    watched_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, film_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_films_user ON user_films(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_films_status ON user_films(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_user_films_favorite ON user_films(user_id, is_favorite);
  CREATE INDEX IF NOT EXISTS idx_user_films_rating ON user_films(user_id, user_rating);
`);

export default db;
