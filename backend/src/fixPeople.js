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

// ============================================================
// ШАГ 1: Слияние дубликатов по имени
// ============================================================
function mergeDuplicates() {
  console.log("🔀 Шаг 1: слияние дубликатов людей\n");

  // Находим имена, у которых больше одной записи
  const dupGroups = db
    .prepare(
      `
    SELECT name, COUNT(*) AS c
    FROM people
    GROUP BY name
    HAVING c > 1
  `,
    )
    .all();

  if (dupGroups.length === 0) {
    console.log("✅ Дубликатов нет.\n");
    return { merged: 0 };
  }

  console.log(`🔍 Найдено имён с дублями: ${dupGroups.length}\n`);

  const getAll = db.prepare(
    "SELECT id, tmdb_id, profile_url FROM people WHERE name = ?",
  );
  const reassignFilmPeople = db.prepare(`
    INSERT OR IGNORE INTO film_people (film_id, person_id, role, character, order_index)
    SELECT film_id, ?, role, character, order_index
    FROM film_people WHERE person_id = ?
  `);
  const deleteOldLinks = db.prepare(
    "DELETE FROM film_people WHERE person_id = ?",
  );
  const deletePerson = db.prepare("DELETE FROM people WHERE id = ?");

  let merged = 0;

  const tx = db.transaction((name) => {
    const rows = getAll.all(name);
    // Главная — запись с tmdb_id (если несколько — берём с наименьшим id)
    const main = rows.find((r) => r.tmdb_id) || rows[0];
    const others = rows.filter((r) => r.id !== main.id);

    for (const dup of others) {
      // 1. Перекидываем все связи на главного
      reassignFilmPeople.run(main.id, dup.id);
      // 2. Удаляем старые связи дубля
      deleteOldLinks.run(dup.id);
      // 3. Удаляем самого дубля
      deletePerson.run(dup.id);
      merged++;
    }

    // Если у главного нет фото, но есть у дубля — перенесём
    if (!main.profile_url) {
      const withPhoto = rows.find((r) => r.profile_url);
      if (withPhoto) {
        db.prepare("UPDATE people SET profile_url = ? WHERE id = ?").run(
          withPhoto.profile_url,
          main.id,
        );
      }
    }
  });

  for (const g of dupGroups) {
    tx(g.name);
  }

  console.log(`✅ Удалено дубликатов: ${merged}\n`);
  return { merged };
}

// ============================================================
// ШАГ 2: Обновление фото
// ============================================================
async function updatePhotos() {
  console.log("📸 Шаг 2: обновление фото\n");

  const people = db
    .prepare(
      `
    SELECT DISTINCT p.id, p.name, p.tmdb_id
    FROM people p
    JOIN film_people fp ON fp.person_id = p.id
    WHERE (p.profile_url IS NULL OR p.profile_url = '')
  `,
    )
    .all();

  if (people.length === 0) {
    console.log("✅ У всех есть фото.\n");
    return;
  }

  console.log(`🔍 Людей без фото: ${people.length}\n`);

  const updatePerson = db.prepare(`
    UPDATE people SET profile_url = ?, tmdb_id = COALESCE(tmdb_id, ?)
    WHERE id = ?
  `);

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < people.length; i++) {
    const person = people[i];

    try {
      let profilePath = null;
      let tmdbId = person.tmdb_id;

      if (tmdbId) {
        const data = await tmdbGet(`/person/${tmdbId}`);
        profilePath = data.profile_path;
      } else {
        const search = await tmdbGet(
          `/search/person?query=${encodeURIComponent(person.name)}`,
        );
        const first = (search.results || [])[0];
        if (first) {
          profilePath = first.profile_path;
          tmdbId = first.id;
        }
      }

      if (profilePath) {
        updatePerson.run(
          `${IMG_BASE}${profilePath}`,
          tmdbId || null,
          person.id,
        );
        updated++;
      } else {
        notFound++;
      }

      if ((i + 1) % 10 === 0 || i === people.length - 1) {
        const pct = (((i + 1) / people.length) * 100).toFixed(0);
        process.stdout.write(
          `\r  📦 ${i + 1}/${people.length} (${pct}%) · обновлено: ${updated} · без фото: ${notFound} · ошибок: ${errors}`,
        );
      }
    } catch (err) {
      errors++;
    }

    await sleep(person.tmdb_id ? 100 : 300);
  }

  console.log("\n");
  console.log("📊 Итоги фото:");
  console.log(`   • Обновлено: ${updated}`);
  console.log(`   • Не найдено: ${notFound}`);
  console.log(`   • Ошибок: ${errors}`);
  console.log(
    `   • Время: ${((Date.now() - startTime) / 1000).toFixed(1)} сек\n`,
  );
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("\n🔧 Исправление данных людей в БД\n");
  console.log("═══════════════════════════════════════\n");

  mergeDuplicates();

  console.log("═══════════════════════════════════════\n");

  await updatePhotos();

  console.log("═══════════════════════════════════════\n");
  console.log("🎉 Готово!\n");

  const total = db.prepare("SELECT COUNT(*) AS c FROM people").get().c;
  const withPhoto = db
    .prepare("SELECT COUNT(*) AS c FROM people WHERE profile_url IS NOT NULL")
    .get().c;

  console.log(`📁 В БД: ${total} людей, из них с фото: ${withPhoto}\n`);

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  db.close();
  process.exit(1);
});
