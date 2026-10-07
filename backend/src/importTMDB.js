import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// НАСТРОЙКИ ИМПОРТА
// ============================================================
const CONFIG = {
  topRatedMovies: 500, // топ-500 фильмов по рейтингу
  popularMovies: 300, // 300 популярных сейчас
  popularTV: 200, // 200 популярных сериалов
  language: "ru-RU", // язык описаний и названий
  delayMs: 280, // пауза между запросами (~3.5 req/sec, безопасно)
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("❌ TMDB_API_KEY не задан в .env");
  process.exit(1);
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdbGet(path, retries = 3) {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=${CONFIG.language}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // rate limit — ждём и пробуем снова
        console.log("   ⏸ Rate limit, жду 5 сек...");
        await sleep(5000);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

async function fetchList(endpoint, totalCount) {
  const pages = Math.ceil(totalCount / 20); // TMDB отдаёт 20 за страницу
  const all = [];
  for (let p = 1; p <= pages; p++) {
    const data = await tmdbGet(`${endpoint}?page=${p}`);
    all.push(...(data.results || []));
    process.stdout.write(
      `\r  📄 ${endpoint} стр. ${p}/${pages} — собрано ${all.length}`,
    );
    await sleep(CONFIG.delayMs);
  }
  process.stdout.write("\n");
  return all.slice(0, totalCount);
}

// ============================================================
// ПОДГОТОВКА БД (prepared statements)
// ============================================================
const insertFilm = db.prepare(`
  INSERT OR IGNORE INTO films
    (tmdb_id, title, original_title, year, director, poster_url,
     description, type, runtime, tmdb_rating)
  VALUES
    (@tmdb_id, @title, @original_title, @year, @director, @poster_url,
     @description, @type, @runtime, @tmdb_rating)
`);

const getFilmIdByTmdb = db.prepare("SELECT id FROM films WHERE tmdb_id = ?");

const insertGenre = db.prepare(
  "INSERT OR IGNORE INTO genres (name, tmdb_id) VALUES (?, ?)",
);
const getGenreId = db.prepare("SELECT id FROM genres WHERE name = ?");
const linkGenre = db.prepare(
  "INSERT OR IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)",
);

const insertPerson = db.prepare(
  "INSERT OR IGNORE INTO people (name, tmdb_id, profile_url) VALUES (?, ?, ?)",
);
const getPersonIdByTmdb = db.prepare("SELECT id FROM people WHERE tmdb_id = ?");
const getPersonIdByName = db.prepare("SELECT id FROM people WHERE name = ?");
const linkFilmPerson = db.prepare(`
  INSERT OR IGNORE INTO film_people (film_id, person_id, role, character, order_index)
  VALUES (?, ?, ?, ?, ?)
`);

// ============================================================
// СОХРАНЕНИЕ ОДНОГО ФИЛЬМА/СЕРИАЛА
// ============================================================
function saveFilm(item, type) {
  const tmdbId = item.id;

  // Если уже есть — пропускаем
  const existing = getFilmIdByTmdb.get(tmdbId);
  if (existing) return { skipped: true };

  // Режиссёр — ищем в crew
  const crew = item.credits?.crew || [];
  const director =
    crew.find((c) => c.job === "Director")?.name ||
    crew.find((c) => c.job === "Creator")?.name ||
    item.created_by?.[0]?.name ||
    null;

  // Год из release_date или first_air_date
  const dateStr = item.release_date || item.first_air_date || "";
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;

  // Название
  const title = item.title || item.name || "Без названия";
  const originalTitle = item.original_title || item.original_name || null;

  // Постер
  const posterUrl = item.poster_path ? `${IMG_BASE}${item.poster_path}` : null;

  // Сохраняем фильм
  insertFilm.run({
    tmdb_id: tmdbId,
    title,
    original_title: originalTitle,
    year: year || null,
    director,
    poster_url: posterUrl,
    description: item.overview || null,
    type,
    runtime: item.runtime || item.episode_run_time?.[0] || null,
    tmdb_rating: item.vote_average || null,
  });

  const filmId = getFilmIdByTmdb.get(tmdbId).id;

  // Жанры
  for (const g of item.genres || []) {
    insertGenre.run(g.name, g.id);
    const genreId = getGenreId.get(g.name).id;
    linkGenre.run(filmId, genreId);
  }

  // Режиссёр
  if (director) {
    insertPerson.run(director, null, null);
    const dirId = getPersonIdByName.get(director)?.id;
    if (dirId) linkFilmPerson.run(filmId, dirId, "director", null, 0);
  }

  // Топ-5 актёров
  const cast = (item.credits?.cast || []).slice(0, 5);
  cast.forEach((actor, idx) => {
    insertPerson.run(
      actor.name,
      actor.id,
      actor.profile_path ? `${IMG_BASE}${actor.profile_path}` : null,
    );
    const actorId = getPersonIdByTmdb.get(actor.id)?.id;
    if (actorId) {
      linkFilmPerson.run(
        filmId,
        actorId,
        "actor",
        actor.character || null,
        idx,
      );
    }
  });

  return { skipped: false };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("\n🎬 CineVault — импорт из TMDB\n");
  console.log("Параметры:");
  console.log(`  • Топ-фильмов по рейтингу: ${CONFIG.topRatedMovies}`);
  console.log(`  • Популярных фильмов: ${CONFIG.popularMovies}`);
  console.log(`  • Популярных сериалов: ${CONFIG.popularTV}`);
  console.log(
    `  • Итого: ~${CONFIG.topRatedMovies + CONFIG.popularMovies + CONFIG.popularTV} позиций`,
  );
  console.log(`  • Задержка между запросами: ${CONFIG.delayMs}мс\n`);

  // Быстрая проверка ключа
  console.log("🔑 Проверяю TMDB API Key...");
  try {
    const test = await tmdbGet("/movie/550");
    console.log(
      `   ✅ Ключ работает. Тестовый фильм: "${test.title}" (${test.release_date?.slice(0, 4)})\n`,
    );
  } catch (err) {
    console.error(`   ❌ Ключ не работает: ${err.message}`);
    process.exit(1);
  }

  // Собираем списки
  console.log("📥 Собираю списки фильмов...");
  const topRated = await fetchList("/movie/top_rated", CONFIG.topRatedMovies);
  const popularM = await fetchList("/movie/popular", CONFIG.popularMovies);
  const popularT = await fetchList("/tv/popular", CONFIG.popularTV);

  // Объединяем и убираем дубли
  const seen = new Set();
  const allItems = [];
  for (const item of [
    ...topRated.map((x) => ({ ...x, _type: "movie" })),
    ...popularM.map((x) => ({ ...x, _type: "movie" })),
    ...popularT.map((x) => ({ ...x, _type: "series" })),
  ]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    allItems.push(item);
  }
  console.log(`\n📊 Уникальных позиций: ${allItems.length}\n`);

  // Основной цикл: детали + credits одним запросом
  let added = 0,
    skipped = 0,
    errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const type = item._type;
    const endpoint = type === "movie" ? `/movie/${item.id}` : `/tv/${item.id}`;

    try {
      // append_to_response=credits — одним запросом получаем и данные, и актёров
      const details = await tmdbGet(`${endpoint}?append_to_response=credits`);
      const result = saveFilm(details, type);

      if (result.skipped) skipped++;
      else added++;

      // Прогресс каждые 10 позиций
      if ((i + 1) % 10 === 0 || i === allItems.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const pct = (((i + 1) / allItems.length) * 100).toFixed(1);
        const eta =
          i > 0
            ? (
                (((Date.now() - startTime) / (i + 1)) *
                  (allItems.length - i - 1)) /
                1000
              ).toFixed(0)
            : "?";
        process.stdout.write(
          `\r  📦 ${i + 1}/${allItems.length} (${pct}%) · добавлено: ${added} · пропущено: ${skipped} · ошибок: ${errors} · ${elapsed}с (осталось ~${eta}с)`,
        );
      }
    } catch (err) {
      errors++;
      console.error(
        `\n   ⚠ Ошибка на «${item.title || item.name}»: ${err.message}`,
      );
    }

    await sleep(CONFIG.delayMs);
  }

  console.log("\n");

  // Итоговая статистика из БД
  const totalFilms = db.prepare("SELECT COUNT(*) AS c FROM films").get().c;
  const totalGenres = db.prepare("SELECT COUNT(*) AS c FROM genres").get().c;
  const totalPeople = db.prepare("SELECT COUNT(*) AS c FROM people").get().c;
  const totalLinks = db
    .prepare("SELECT COUNT(*) AS c FROM film_people")
    .get().c;

  console.log("🎉 Импорт завершён!\n");
  console.log("📊 Итоги:");
  console.log(`   • Добавлено новых: ${added}`);
  console.log(`   • Пропущено (уже были): ${skipped}`);
  console.log(`   • Ошибок: ${errors}`);
  console.log(
    `   • Время: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} мин\n`,
  );
  console.log("📁 В базе сейчас:");
  console.log(`   • Фильмов и сериалов: ${totalFilms}`);
  console.log(`   • Жанров: ${totalGenres}`);
  console.log(`   • Людей (актёров + режиссёров): ${totalPeople}`);
  console.log(`   • Связей фильм-человек: ${totalLinks}\n`);

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  db.close();
  process.exit(1);
});
