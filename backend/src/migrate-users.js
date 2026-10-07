import db from "./db.js";

// Поля, которые нужно добавить в таблицу users (если их ещё нет)
const NEW_COLUMNS = [
  { name: "full_name", type: "TEXT" },
  { name: "avatar_url", type: "TEXT" },
  { name: "workplace", type: "TEXT" },
  { name: "bio", type: "TEXT" },
  { name: "city", type: "TEXT" },
  { name: "website", type: "TEXT" },
  { name: "telegram", type: "TEXT" },
  { name: "instagram", type: "TEXT" },
  { name: "updated_at", type: "TEXT" }, // ← добавить эту строку
];

function main() {
  console.log("\n🔧 Миграция таблицы users\n");
  console.log("═══════════════════════════════════════\n");

  // Получаем список существующих колонок
  const existingCols = db.prepare("PRAGMA table_info(users)").all();
  const existingNames = new Set(existingCols.map((c) => c.name));

  console.log(
    `📋 Существующие колонки: ${existingCols.map((c) => c.name).join(", ")}\n`,
  );

  let added = 0;
  let skipped = 0;

  for (const col of NEW_COLUMNS) {
    if (existingNames.has(col.name)) {
      console.log(`♻️  Колонка уже есть: ${col.name}`);
      skipped++;
      continue;
    }

    try {
      db.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`✅ Добавлена: ${col.name} ${col.type}`);
      added++;
    } catch (err) {
      console.error(`❌ Ошибка при добавлении ${col.name}: ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════\n");
  console.log("📊 Итоги:");
  console.log(`   • Добавлено колонок: ${added}`);
  console.log(`   • Уже существовало:  ${skipped}\n`);

  // Финальная проверка
  const finalCols = db.prepare("PRAGMA table_info(users)").all();
  console.log("📋 Все колонки таблицы users:\n");
  for (const c of finalCols) {
    console.log(`   ${c.name.padEnd(20)} ${c.type}`);
  }

  console.log("\n🎉 Готово!\n");
  db.close();
}

main();
