import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("❌ TMDB_API_KEY не задан в .env");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdbGet(path, retries = 3) {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}`;
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

async function main() {
  console.log("\n🖼  Обновление постеров у фильмов без картинки\n");

  // Берём все фильмы с tmdb_id, но без poster_url
  const films = db
    .prepare(
      `
    SELECT id, tmdb_id, title, type
    FROM films
    WHERE tmdb_id IS NOT NULL AND (poster_url IS NULL OR poster_url = '')
  `,
    )
    .all();

  if (films.length === 0) {
    console.log("✅ Все фильмы уже имеют постеры. Нечего обновлять.");
    db.close();
    return;
  }

  console.log(`🔍 Найдено фильмов без постера: ${films.length}\n`);

  const update = db.prepare("UPDATE films SET poster_url = ? WHERE id = ?");

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    const endpoint =
      film.type === "series" ? `/tv/${film.tmdb_id}` : `/movie/${film.tmdb_id}`;

    try {
      const data = await tmdbGet(endpoint);
      if (data.poster_path) {
        const url = `${IMG_BASE}${data.poster_path}`;
        update.run(url, film.id);
        updated++;
      } else {
        notFound++;
      }

      if ((i + 1) % 5 === 0 || i === films.length - 1) {
        const pct = (((i + 1) / films.length) * 100).toFixed(0);
        process.stdout.write(
          `\r  📦 ${i + 1}/${films.length} (${pct}%) · обновлено: ${updated} · без постера: ${notFound} · ошибок: ${errors}`,
        );
      }
    } catch (err) {
      errors++;
      console.error(`\n   ⚠ Ошибка на «${film.title}»: ${err.message}`);
    }

    await sleep(250);
  }

  console.log("\n");
  console.log("🎉 Готово!\n");
  console.log("📊 Итоги:");
  console.log(`   • Обновлено постеров: ${updated}`);
  console.log(`   • Без постера в TMDB: ${notFound}`);
  console.log(`   • Ошибок: ${errors}`);
  console.log(
    `   • Время: ${((Date.now() - startTime) / 1000).toFixed(1)} сек\n`,
  );

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  db.close();
  process.exit(1);
});
