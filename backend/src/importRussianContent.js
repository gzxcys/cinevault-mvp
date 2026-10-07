import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const CONFIG = {
  sovietMovies: 400,
  modernMovies: 400,
  tvShows: 200,
  language: "ru-RU",
  delayMs: 280,
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

async function fetchDiscover(endpoint, params, totalCount) {
  const pages = Math.ceil(totalCount / 20);
  const all = [];
  for (let p = 1; p <= pages; p++) {
    const qs = new URLSearchParams({ ...params, page: String(p) }).toString();
    const data = await tmdbGet(`${endpoint}?${qs}`);
    all.push(...(data.results || []));
    process.stdout.write(
      `\r  📄 ${endpoint} стр. ${p}/${pages} — собрано ${all.length}`,
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
const countFilmGenres = db.prepare(
  "SELECT COUNT(*) AS c FROM film_genres WHERE film_id = ?",
);
const countFilmPeople = db.prepare(
  "SELECT COUNT(*) AS c FROM film_people WHERE film_id = ?",
);

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
// ДОЗАПОЛНЕНИЕ ЖАНРОВ
// ============================================================
function fillGenres(filmId, genres) {
  let added = 0;
  for (const g of genres || []) {
    if (!g?.name) continue;
    const name = g.name.toString().trim();
    const tmdbGenreId = g.id || null;

    try {
      let row = null;
      if (tmdbGenreId) row = getGenreIdByTmdb.get(tmdbGenreId);

      if (!row) {
        try {
          insertGenre.run(name, tmdbGenreId);
        } catch {
          /* конфликт */
        }
        if (tmdbGenreId) row = getGenreIdByTmdb.get(tmdbGenreId);
        if (!row) row = getGenreIdByName.get(name);
      }

      if (row) {
        const info = linkGenre.run(filmId, row.id);
        if (info.changes > 0) added++;
      }
    } catch (e) {
      console.warn(`\n   ⚠ Жанр "${name}": ${e.message}`);
    }
  }
  return added;
}

// ============================================================
// ДОЗАПОЛНЕНИЕ РЕЖИССЁРА И АКТЁРОВ
// ============================================================
function fillPeople(filmId, director, cast) {
  let added = 0;

  if (director) {
    try {
      insertPerson.run(director, null, null);
      const dirId = getPersonIdByName.get(director)?.id;
      if (dirId) {
        const info = linkFilmPerson.run(filmId, dirId, "director", null, 0);
        if (info.changes > 0) added++;
      }
    } catch {
      /* skip */
    }
  }

  (cast || []).slice(0, 5).forEach((actor, idx) => {
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
        const info = linkFilmPerson.run(
          filmId,
          actorId,
          "actor",
          actor.character || null,
          idx,
        );
        if (info.changes > 0) added++;
      }
    } catch {
      /* skip */
    }
  });

  return added;
}

// ============================================================
// СОХРАНЕНИЕ / ДОЗАПОЛНЕНИЕ
// ============================================================
function saveFilm(item, type) {
  const tmdbId = item?.id;
  if (!tmdbId) return { skipped: true, reason: "no tmdb_id" };

  const crew = item.credits?.crew || [];
  const director =
    crew.find((c) => c.job === "Director")?.name ||
    item.created_by?.[0]?.name ||
    null;
  const cast = (item.credits?.cast || []).slice(0, 5);

  const existing = getFilmId.get(tmdbId);

  // ── Случай 1: фильм уже есть — дозаполняем если чего-то не хватает ──
  if (existing) {
    const filmId = existing.id;
    const genreCount = countFilmGenres.get(filmId).c;
    const peopleCount = countFilmPeople.get(filmId).c;

    let updated = 0;
    if (genreCount === 0) updated += fillGenres(filmId, item.genres);
    if (peopleCount === 0) updated += fillPeople(filmId, director, cast);

    return { skipped: true, updated };
  }

  // ── Случай 2: новый фильм ──
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
    type,
    runtime: item.runtime || item.episode_run_time?.[0] || null,
    tmdb_rating: item.vote_average || null,
  });

  const filmId = info.lastInsertRowid;
  if (!filmId) return { skipped: true };

  fillGenres(filmId, item.genres);
  fillPeople(filmId, director, cast);

  return { skipped: false };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("\n🇷🇺 CineVault — импорт российского и советского контента\n");
  console.log("Параметры:");
  console.log(`  • Советские фильмы (до 1992): ${CONFIG.sovietMovies}`);
  console.log(`  • Современные фильмы (с 2000): ${CONFIG.modernMovies}`);
  console.log(`  • Сериалы (RU/SU): ${CONFIG.tvShows}`);
  console.log(
    `  • Итого: ~${CONFIG.sovietMovies + CONFIG.modernMovies + CONFIG.tvShows} позиций\n`,
  );

  console.log("🔑 Проверяю TMDB API Key...");
  try {
    const test = await tmdbGet("/movie/550");
    console.log(`   ✅ Ключ работает. Тест: "${test.title}"\n`);
  } catch (err) {
    console.error(`   ❌ Ключ не работает: ${err.message}`);
    process.exit(1);
  }

  // 1. Советская классика
  console.log("📥 Собираю советские фильмы (до 1992)...");
  const soviet = await fetchDiscover(
    "/discover/movie",
    {
      with_original_language: "ru",
      "primary_release_date.lte": "1992-12-31",
      sort_by: "vote_count.desc",
      "vote_count.gte": "30",
    },
    CONFIG.sovietMovies,
  );

  // 2. Современные российские
  console.log("📥 Собираю современные российские фильмы (с 2000)...");
  const modern = await fetchDiscover(
    "/discover/movie",
    {
      with_original_language: "ru",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "vote_count.desc",
      "vote_count.gte": "50",
    },
    CONFIG.modernMovies,
  );

  // 3. Сериалы
  console.log("📥 Собираю российские сериалы...");
  const tv = await fetchDiscover(
    "/discover/tv",
    {
      with_original_language: "ru",
      sort_by: "popularity.desc",
      "vote_count.gte": "20",
    },
    CONFIG.tvShows,
  );

  // Дедупликация
  const seen = new Set();
  const all = [];
  for (const item of [
    ...soviet.map((x) => ({ ...x, _type: "movie" })),
    ...modern.map((x) => ({ ...x, _type: "movie" })),
    ...tv.map((x) => ({ ...x, _type: "tv" })),
  ]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    all.push(item);
  }
  console.log(`\n📊 Уникальных позиций: ${all.length}\n`);

  let added = 0,
    skipped = 0,
    updated = 0,
    errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    const type = item._type === "tv" ? "series" : "movie";
    const endpoint =
      item._type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;

    try {
      const details = await tmdbGet(`${endpoint}?append_to_response=credits`);
      const result = saveFilm(details, type);

      if (result.skipped) {
        skipped++;
        if (result.updated > 0) updated++;
      } else {
        added++;
      }

      if ((i + 1) % 10 === 0 || i === all.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const pct = (((i + 1) / all.length) * 100).toFixed(1);
        const eta =
          i > 0
            ? (
                (((Date.now() - startTime) / (i + 1)) * (all.length - i - 1)) /
                1000
              ).toFixed(0)
            : "?";
        process.stdout.write(
          `\r  📦 ${i + 1}/${all.length} (${pct}%) · новых: ${added} · дозаполнено: ${updated} · пропущено: ${skipped - updated} · ошибок: ${errors} · ${elapsed}с (осталось ~${eta}с)`,
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

  const total = db.prepare("SELECT COUNT(*) AS c FROM films").get().c;

  console.log("🎉 Импорт завершён!\n");
  console.log("📊 Итоги:");
  console.log(`   • Добавлено новых фильмов: ${added}`);
  console.log(`   • Дозаполнено данными: ${updated}`);
  console.log(`   • Пропущено (уже полные): ${skipped - updated}`);
  console.log(`   • Ошибок: ${errors}`);
  console.log(
    `   • Время: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} мин\n`,
  );
  console.log(`📁 Всего фильмов в БД: ${total}\n`);

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  db.close();
  process.exit(1);
});
