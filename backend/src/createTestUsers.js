import bcrypt from "bcryptjs";
import db from "./db.js";

// ============================================================
// ПРОФИЛИ ТЕСТОВЫХ ЮЗЕРОВ
// ============================================================
const PROFILES = [
  {
    email: "nolan.fan@cinevault.com",
    name: "Алексей Морозов",
    password: "demo123",
    bio: "Фанат Нолана, любит фантастику и триллеры",
    favoriteGenres: ["Фантастика", "Триллер", "Боевик", "Детектив"],
    favoriteDirectors: ["Кристофер Нолан", "Дени Вильнёв"],
    targetCount: 60,
    taste: "sci-fi-thriller",
  },
  {
    email: "anime.lover@cinevault.com",
    name: "Мария Сато",
    password: "demo123",
    bio: "Аниме-энтузиаст, обожает Миядзаки",
    favoriteGenres: ["Мультфильм", "Аниме", "Фэнтези", "Приключения"],
    favoriteDirectors: ["Хаяо Миядзаки"],
    targetCount: 55,
    taste: "anime",
  },
  {
    email: "classic@cinevault.com",
    name: "Игорь Петров",
    password: "demo123",
    bio: "Ценитель классики, драмы и криминала",
    favoriteGenres: ["Драма", "Криминал", "История", "Вестерн"],
    favoriteDirectors: ["Мартин Скорсезе", "Фрэнсис Форд Коппола"],
    targetCount: 70,
    taste: "classic-drama",
  },
  {
    email: "marvelfan@cinevault.com",
    name: "Дмитрий Волков",
    password: "demo123",
    bio: "Люблю блокбастеры и экшен",
    favoriteGenres: ["Боевик", "Приключения", "Фантастика", "Триллер"],
    favoriteDirectors: ["Братья Руссо", "Джеймс Кэмерон"],
    targetCount: 65,
    taste: "blockbuster",
  },
];

// ============================================================
// ХЕЛПЕРЫ
// ============================================================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ============================================================
// ПОИСК ФИЛЬМОВ В КАТАЛОГЕ
// ============================================================
function findFilmsByGenres(genres, limit, excludeIds = []) {
  if (genres.length === 0) return [];
  const placeholders = genres.map(() => "?").join(",");
  const excludeClause =
    excludeIds.length > 0
      ? `AND f.id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";

  return db
    .prepare(
      `
    SELECT DISTINCT f.id, f.type
    FROM films f
    JOIN film_genres fg ON fg.film_id = f.id
    JOIN genres g ON g.id = fg.genre_id
    WHERE g.name IN (${placeholders})
      AND f.tmdb_rating IS NOT NULL
      ${excludeClause}
    ORDER BY f.tmdb_rating DESC
    LIMIT ?
  `,
    )
    .all(...genres, ...excludeIds, limit);
}

function findFilmsByDirectors(directors, limit, excludeIds = []) {
  if (directors.length === 0) return [];
  const placeholders = directors.map(() => "?").join(",");
  const excludeClause =
    excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";

  return db
    .prepare(
      `
    SELECT id, type
    FROM films
    WHERE director IN (${placeholders})
      AND tmdb_rating IS NOT NULL
      ${excludeClause}
    ORDER BY tmdb_rating DESC
    LIMIT ?
  `,
    )
    .all(...directors, ...excludeIds, limit);
}

function findRandomFilms(limit, excludeIds = []) {
  const excludeClause =
    excludeIds.length > 0
      ? `WHERE id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";
  return db
    .prepare(
      `
    SELECT id, type
    FROM films
    ${excludeClause}
    ORDER BY RANDOM()
    LIMIT ?
  `,
    )
    .all(...excludeIds, limit);
}

// Источник — взвешенное распределение (60% streaming, 25% local, 15% physical)
function pickSource() {
  const r = Math.random();
  if (r < 0.6) {
    const names = [
      "Netflix",
      "Кинопоиск",
      "Disney+",
      "Prime Video",
      "Okko",
      "Иви",
    ];
    return { type: "streaming", name: names[randomInt(0, names.length - 1)] };
  }
  if (r < 0.85) {
    return { type: "local", name: `/Movies/film_${randomInt(1000, 9999)}.mkv` };
  }
  const physical = ["DVD", "Blu-ray", "4K UHD", "VHS"];
  return {
    type: "physical",
    name: physical[randomInt(0, physical.length - 1)],
  };
}

// ============================================================
// НАПОЛНЕНИЕ БИБЛИОТЕКИ ЮЗЕРА
// ============================================================
const insertUserFilm = db.prepare(`
  INSERT OR IGNORE INTO user_films
    (user_id, film_id, status, is_favorite, source_type,
     source_name, user_rating, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function fillLibrary(userId, profile) {
  // 1. Убираем старую библиотеку
  db.prepare("DELETE FROM user_films WHERE user_id = ?").run(userId);

  const added = new Set();
  const usedIds = [];

  const { favoriteGenres, favoriteDirectors, targetCount } = profile;

  // Распределение по статусам:
  // ~60% watched, ~15% watching, ~25% planned
  const watchedCount = Math.floor(targetCount * 0.6);
  const watchingCount = Math.floor(targetCount * 0.15);
  const plannedCount = targetCount - watchedCount - watchingCount;

  // ─── A. Фильмы по любимым жанрам (watched, rating 4-5) ───
  const byGenre = findFilmsByGenres(favoriteGenres, watchedCount, usedIds);
  for (const f of byGenre) {
    if (added.has(f.id)) continue;
    added.add(f.id);
    usedIds.push(f.id);

    const source = pickSource();
    const rating = randomInt(4, 5);
    const isFav = Math.random() < 0.35 ? 1 : 0; // 35% из них в избранном
    const tags = [];
    if (isFav) tags.push("Любимое");
    if (Math.random() < 0.3) tags.push("Пересмотреть");

    insertUserFilm.run(
      userId,
      f.id,
      "watched",
      isFav,
      source.type,
      source.name,
      rating,
      JSON.stringify(tags),
    );
  }

  // ─── B. Фильмы по любимым режиссёрам (watched, rating 5) ───
  const byDirector = findFilmsByDirectors(favoriteDirectors, 15, usedIds);
  for (const f of byDirector) {
    if (added.has(f.id)) continue;
    added.add(f.id);
    usedIds.push(f.id);

    const source = pickSource();
    insertUserFilm.run(
      userId,
      f.id,
      "watched",
      1, // все от любимого режиссёра — в избранное
      source.type,
      source.name,
      5,
      JSON.stringify(["Режиссёр"]),
    );
  }

  // ─── C. Сериалы в жанрах (watching) ───
  const seriesCandidates = findFilmsByGenres(
    favoriteGenres,
    30,
    usedIds,
  ).filter((f) => f.type === "series");
  const watchingPick = pick(
    seriesCandidates,
    Math.min(watchingCount, seriesCandidates.length),
  );
  for (const f of watchingPick) {
    if (added.has(f.id)) continue;
    added.add(f.id);
    usedIds.push(f.id);

    const source = pickSource();
    insertUserFilm.run(
      userId,
      f.id,
      "watching",
      Math.random() < 0.3 ? 1 : 0,
      source.type,
      source.name,
      null,
      JSON.stringify(["Сериал"]),
    );
  }

  // ─── D. Случайные фильмы в планах ───
  const randomForPlanned = findRandomFilms(plannedCount + 20, usedIds);
  const plannedPick = pick(randomForPlanned, plannedCount);
  for (const f of plannedPick) {
    if (added.has(f.id)) continue;
    added.add(f.id);
    usedIds.push(f.id);

    const source = pickSource();
    insertUserFilm.run(
      userId,
      f.id,
      "planned",
      0,
      source.type,
      source.name,
      null,
      JSON.stringify(["Посмотреть"]),
    );
  }

  // ─── E. «Не зашли» — случайные фильмы в нелюбимых жанрах, rating 2-3 ───
  //         Нужны для контраста в рекомендациях.
  const disliked = findRandomFilms(15, usedIds);
  for (const f of disliked) {
    if (added.has(f.id)) continue;
    added.add(f.id);

    const source = pickSource();
    const rating = randomInt(2, 3);
    insertUserFilm.run(
      userId,
      f.id,
      "watched",
      0,
      source.type,
      source.name,
      rating,
      JSON.stringify([]),
    );
  }

  return added.size;
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log("\n👥 Создание тестовых профилей с разными вкусами\n");
  console.log("═══════════════════════════════════════════════\n");

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, email_verified)
    VALUES (?, ?, ?, 1)
  `);
  const getUser = db.prepare("SELECT id FROM users WHERE email = ?");

  for (const profile of PROFILES) {
    let userId = getUser.get(profile.email)?.id;

    if (!userId) {
      const hash = bcrypt.hashSync(profile.password, 10);
      const info = insertUser.run(profile.email, hash, profile.name);
      userId = info.lastInsertRowid;
      console.log(`✅ Создан юзер: ${profile.email} — ${profile.name}`);
    } else {
      console.log(`♻️  Юзер уже есть: ${profile.email}`);
    }

    const count = fillLibrary(userId, profile);
    console.log(
      `   📚 Заполнена библиотека: ${count} фильмов (${profile.bio})`,
    );
    console.log("");
  }

  console.log("═══════════════════════════════════════════════\n");
  console.log("🎉 Готово!\n");

  // Итоговая статистика
  const users = db
    .prepare(
      `
    SELECT u.id, u.email, u.name, COUNT(uf.id) AS films
    FROM users u
    LEFT JOIN user_films uf ON uf.user_id = u.id
    GROUP BY u.id
    ORDER BY u.id
  `,
    )
    .all();

  console.log("📊 Все пользователи в БД:\n");
  for (const u of users) {
    console.log(
      `   #${u.id}  ${u.email.padEnd(32)} ${u.name.padEnd(22)} — ${u.films} фильмов`,
    );
  }

  console.log("\n📧 Все тестовые пароли: demo123\n");

  db.close();
}

main();
