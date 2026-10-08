import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// НАСТРОЙКИ
// ============================================================
const CONFIG = {
  // Источники: страна → сколько фильмов
  sources: [
    { country: "FR", count: 130, label: "Франция" },
    { country: "IT", count: 130, label: "Италия" },
    { country: "JP", count: 130, label: "Япония" },
    { country: "KR", count: 130, label: "Корея" },
    { country: "DE", count: 110, label: "Германия" },
    { country: "ES", count: 100, label: "Испания" },
    { country: "GB", count: 110, label: "Великобритания" },
    { country: "IN", count: 80, label: "Индия" },
    { country: "CN", count: 60, label: "Китай" },
    { country: "SE", count: 50, label: "Швеция" },
  ],
  actorsPerFilm: 15, // было 5 — теперь 15
  language: "ru-RU",
  delayMs: 220, // ~4.5 req/sec — безопасно под лимит TMDB
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_PROFILE = "https://image.tmdb.org/t/p/w185";
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("❌ TMDB_API_KEY не задан в .env");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdbGet(path, retries = 3) {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=${CONFIG.language}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.log("   ⏸ Rate limit, жду 5 сек...");
        await sleep(5000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

async function fetchDiscoverByCountry(country, totalCount) {
  const pages = Math.ceil(totalCount / 20);
  const all = [];
  for (let p = 1; p <= pages; p++) {
    const qs = new URLSearchParams({
      with_origin_country: country,
      sort_by: "vote_count.desc",
      "vote_count.gte": "50",
      "vote_average.gte": "5.5",
      page: String(p),
    }).toString();

    const data = await tmdbGet(`/discover/movie?${qs}`);
    all.push(...(data.results || []));
    process.stdout.write(
      `\r  📄 ${country} стр. ${p}/${pages} — собрано ${all.length}`,
    );
    await sleep(CONFIG.delayMs);
    if ((data.results || []).length < 20) break;
  }
  process.stdout.write("\n");
  return all.slice(0, totalCount);
}

// ============================================================
// PREPARED STATEMENTS
// ============================================================
const insertFilm = db.prepare(`
  INSERT OR IGNORE INTO films
    (tmdb_id, title, original_title, year, director, poster_url,
     description, type, runtime, tmdb_rating)
  VALUES
    (@tmdb_id, @title, @original_title, @year, @director, @poster_url,
     @description, @type, @runtime, @tmdb_rating)
`);
const getFilmId = db.prepare("SELECT id FROM films WHERE tmdb_id = ?");

const insertGenre = db.prepare(
  "INSERT OR IGNORE INTO genres (name, tmdb_id) VALUES (?, ?)",
);
const getGenreIdByTmdb = db.prepare("SELECT id FROM genres WHERE tmdb_id = ?");
const getGenreIdByName = db.prepare("SELECT id FROM genres WHERE name = ?");
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
// СОХРАНЕНИЕ
// ============================================================
function saveFilm(item) {
  const tmdbId = item?.id;
  if (!tmdbId) return { skipped: true };
  if (getFilmId.get(tmdbId)) return { skipped: true };

  const crew = item.credits?.crew || [];
  const director =
    crew.find((c) => c.job === "Director")?.name ||
    item.created_by?.[0]?.name ||
    null;

  const dateStr = item.release_date || item.first_air_date || "";
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;

  const title = (item.title || item.name || "Без названия").toString().trim();
  const originalTitle = item.original_title || item.original_name || null;
  const posterUrl = item.poster_path ? `${IMG_BASE}${item.poster_path}` : null;

  const info = insertFilm.run({
    tmdb_id: tmdbId,
    title,
    original_title: originalTitle,
    year: year || null,
    director,
    poster_url: posterUrl,
    description: item.overview || null,
    type: "movie",
    runtime: item.runtime || null,
    tmdb_rating: item.vote_average || null,
  });

  const filmId = info.lastInsertRowid;
  if (!filmId) return { skipped: true };

  // Жанры
  for (const g of item.genres || []) {
    if (!g?.name) continue;
    const name = g.name.toString().trim();
    try {
      let row = g.id ? getGenreIdByTmdb.get(g.id) : null;
      if (!row) {
        try {
          insertGenre.run(name, g.id || null);
        } catch {
          /* конфликт */
        }
        if (g.id) row = getGenreIdByTmdb.get(g.id);
        if (!row) row = getGenreIdByName.get(name);
      }
      if (row) linkGenre.run(filmId, row.id);
    } catch {
      /* skip */
    }
  }

  // Режиссёр
  if (director) {
    try {
      insertPerson.run(director, null, null);
      const dirId = getPersonIdByName.get(director)?.id;
      if (dirId) linkFilmPerson.run(filmId, dirId, "director", null, 0);
    } catch {
      /* skip */
    }
  }

  // Топ-15 актёров
  const cast = (item.credits?.cast || []).slice(0, CONFIG.actorsPerFilm);
  cast.forEach((actor, idx) => {
    if (!actor?.name) return;
    try {
      const profileUrl = actor.profile_path
        ? `${IMG_PROFILE}${actor.profile_path}`
        : null;
      insertPerson.run(actor.name, actor.id || null, profileUrl);
      const actorId = actor.id
        ? getPersonIdByTmdb.get(actor.id)?.id
        : getPersonIdByName.get(actor.name)?.id;
      if (actorId) {
        linkFilmPerson.run(
          filmId,
          actorId,
          "actor",
          actor.character || null,
          idx,
        );
      }
    } catch {
      /* skip */
    }
  });

  return { skipped: false };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("\n🌍 CineVault — импорт мирового кино\n");
  console.log("Источники:");
  let totalPlanned = 0;
  for (const s of CONFIG.sources) {
    console.log(`  • ${s.label.padEnd(20)} — ${s.count} фильмов`);
    totalPlanned += s.count;
  }
  console.log(`\n  Итого: ~${totalPlanned} фильмов`);
  console.log(`  Актёров на фильм: ${CONFIG.actorsPerFilm}\n`);

  // Проверка ключа
  console.log("🔑 Проверяю TMDB API Key...");
  try {
    const test = await tmdbGet("/movie/550");
    console.log(`   ✅ Ключ работает. Тест: "${test.title}"\n`);
  } catch (err) {
    console.error(`   ❌ Ключ не работает: ${err.message}`);
    process.exit(1);
  }

  // Собираем все фильмы по странам
  const allFilms = [];
  const seen = new Set();

  for (const src of CONFIG.sources) {
    console.log(`📥 ${src.label} (${src.country})...`);
    const films = await fetchDiscoverByCountry(src.country, src.count);
    for (const f of films) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      allFilms.push(f);
    }
  }

  console.log(`\n📊 Уникальных позиций: ${allFilms.length}\n`);

  // Загружаем детали + credits и сохраняем
  let added = 0,
    skipped = 0,
    errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < allFilms.length; i++) {
    const item = allFilms[i];

    try {
      const details = await tmdbGet(
        `/movie/${item.id}?append_to_response=credits`,
      );
      const result = saveFilm(details);
      if (result.skipped) skipped++;
      else added++;

      if ((i + 1) % 10 === 0 || i === allFilms.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const pct = (((i + 1) / allFilms.length) * 100).toFixed(1);
        const eta =
          i > 0
            ? (
                (((Date.now() - startTime) / (i + 1)) *
                  (allFilms.length - i - 1)) /
                1000
              ).toFixed(0)
            : "?";
        process.stdout.write(
          `\r  📦 ${i + 1}/${allFilms.length} (${pct}%) · добавлено: ${added} · пропущено: ${skipped} · ошибок: ${errors} · ${elapsed}с (осталось ~${eta}с)`,
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

  const totalFilms = db.prepare("SELECT COUNT(*) AS c FROM films").get().c;
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
  console.log(`   • Фильмов: ${totalFilms}`);
  console.log(`   • Людей: ${totalPeople}`);
  console.log(`   • Связей фильм-человек: ${totalLinks}\n`);

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  db.close();
  process.exit(1);
});
