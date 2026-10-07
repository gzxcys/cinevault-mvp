import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w185";
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
  console.log("\n🎭 Обновление фото актёров и режиссёров\n");

  // 1. Находим всех людей без profile_url, которые привязаны хотя бы к одному фильму
  const peopleWithoutPhoto = db
    .prepare(
      `
    SELECT DISTINCT p.id, p.name, p.tmdb_id
    FROM people p
    JOIN film_people fp ON fp.person_id = p.id
    WHERE (p.profile_url IS NULL OR p.profile_url = '')
      AND p.name IS NOT NULL
  `,
    )
    .all();

  if (peopleWithoutPhoto.length === 0) {
    console.log("✅ У всех людей уже есть фото. Нечего обновлять.");
    db.close();
    return;
  }

  console.log(`🔍 Найдено людей без фото: ${peopleWithoutPhoto.length}\n`);

  const updatePerson = db.prepare(`
    UPDATE people SET profile_url = ?, tmdb_id = COALESCE(tmdb_id, ?)
    WHERE id = ?
  `);

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < peopleWithoutPhoto.length; i++) {
    const person = peopleWithoutPhoto[i];

    try {
      let profilePath = null;
      let tmdbPersonId = person.tmdb_id;

      // Если есть tmdb_id — точечный запрос
      if (tmdbPersonId) {
        const data = await tmdbGet(`/person/${tmdbPersonId}`);
        profilePath = data.profile_path;
      } else {
        // Иначе — поиск по имени
        const search = await tmdbGet(
          `/search/person?query=${encodeURIComponent(person.name)}`,
        );
        const first = (search.results || [])[0];
        if (first) {
          profilePath = first.profile_path;
          tmdbPersonId = first.id;
        }
      }

      if (profilePath) {
        const url = `${IMG_BASE}${profilePath}`;
        updatePerson.run(url, tmdbPersonId || null, person.id);
        updated++;
      } else {
        notFound++;
      }

      if ((i + 1) % 5 === 0 || i === peopleWithoutPhoto.length - 1) {
        const pct = (((i + 1) / peopleWithoutPhoto.length) * 100).toFixed(0);
        process.stdout.write(
          `\r  📦 ${i + 1}/${peopleWithoutPhoto.length} (${pct}%) · обновлено: ${updated} · без фото: ${notFound} · ошибок: ${errors}`,
        );
      }
    } catch (err) {
      errors++;
      console.error(`\n   ⚠ Ошибка на «${person.name}»: ${err.message}`);
    }

    // Поиск по имени — тяжелее, ставим паузу побольше
    await sleep(person.tmdb_id ? 120 : 300);
  }

  console.log("\n");
  console.log("🎉 Готово!\n");
  console.log("📊 Итоги:");
  console.log(`   • Обновлено фото: ${updated}`);
  console.log(`   • Не найдено в TMDB: ${notFound}`);
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
