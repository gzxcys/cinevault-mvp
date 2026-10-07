import db from "./db.js";

function normalizeGenreName(name) {
  if (!name) return name;
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function main() {
  console.log("\n🏷  Исправление дубликатов жанров\n");
  console.log("═══════════════════════════════════════\n");

  // 1. Находим группы жанров с одинаковым именем в нижнем регистре
  const dupGroups = db
    .prepare(
      `
    SELECT LOWER(name) AS lower_name, GROUP_CONCAT(id) AS ids, COUNT(*) AS c
    FROM genres
    GROUP BY LOWER(name)
    HAVING c > 1
  `,
    )
    .all();

  console.log(`🔍 Найдено групп с дублями: ${dupGroups.length}\n`);

  const getGenre = db.prepare("SELECT id, name FROM genres WHERE id = ?");
  const reassignLinks = db.prepare(`
    INSERT OR IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)
  `);
  const getLinks = db.prepare(
    "SELECT film_id FROM film_genres WHERE genre_id = ?",
  );
  const deleteLinks = db.prepare("DELETE FROM film_genres WHERE genre_id = ?");
  const deleteGenre = db.prepare("DELETE FROM genres WHERE id = ?");
  const updateName = db.prepare("UPDATE genres SET name = ? WHERE id = ?");

  let totalMerged = 0;
  let totalRenamed = 0;

  const tx = db.transaction((group) => {
    const ids = group.ids.split(",").map(Number);
    const genres = ids.map((id) => getGenre.get(id)).filter(Boolean);

    if (genres.length === 0) return;

    // Выбираем "канонический": тот, у которого уже правильный регистр
    // (первая буква заглавная), иначе первый по id
    const canonical =
      genres.find((g) => g.name === normalizeGenreName(g.name)) || genres[0];
    const others = genres.filter((g) => g.id !== canonical.id);

    // Нормализуем имя канонического
    const normalized = normalizeGenreName(canonical.name);
    if (canonical.name !== normalized) {
      updateName.run(normalized, canonical.id);
      totalRenamed++;
    }

    // Перекидываем все связи на канонический
    for (const other of others) {
      const links = getLinks.all(other.id);
      for (const link of links) {
        reassignLinks.run(link.film_id, canonical.id);
      }
      deleteLinks.run(other.id);
      deleteGenre.run(other.id);
      totalMerged++;
    }
  });

  for (const group of dupGroups) {
    tx(group);
  }

  // 2. Дополнительно: нормализуем регистр у ВСЕХ жанров, у которых он неправильный
  const allGenres = db.prepare("SELECT id, name FROM genres").all();
  let extraRenamed = 0;
  for (const g of allGenres) {
    const norm = normalizeGenreName(g.name);
    if (g.name !== norm) {
      // Проверяем, нет ли уже жанра с таким именем
      const existing = db
        .prepare("SELECT id FROM genres WHERE name = ? AND id != ?")
        .get(norm, g.id);
      if (existing) {
        // Сливаем с existing
        const links = getLinks.all(g.id);
        for (const link of links) reassignLinks.run(link.film_id, existing.id);
        deleteLinks.run(g.id);
        deleteGenre.run(g.id);
        totalMerged++;
      } else {
        updateName.run(norm, g.id);
        extraRenamed++;
      }
    }
  }

  console.log("📊 Итоги:");
  console.log(
    `   • Переименовано в правильный регистр: ${totalRenamed + extraRenamed}`,
  );
  console.log(`   • Объединено дубликатов: ${totalMerged}`);

  const total = db.prepare("SELECT COUNT(*) AS c FROM genres").get().c;
  console.log(`   • Жанров сейчас: ${total}\n`);

  console.log("📋 Список всех жанров:\n");
  const genres = db
    .prepare(
      `
    SELECT g.name, COUNT(DISTINCT fg.film_id) AS films
    FROM genres g
    LEFT JOIN film_genres fg ON fg.genre_id = g.id
    GROUP BY g.id
    ORDER BY films DESC
  `,
    )
    .all();
  for (const g of genres) {
    console.log(`   ${g.name.padEnd(25)} — ${g.films} фильмов`);
  }
  console.log("\n🎉 Готово!\n");

  db.close();
}

main();
