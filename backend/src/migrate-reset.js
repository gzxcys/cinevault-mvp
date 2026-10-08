import db from "./db.js";

const cols = db.prepare("PRAGMA table_info(users)").all();
const existing = new Set(cols.map((c) => c.name));

const NEW_COLUMNS = [
  { name: "reset_token", type: "TEXT" },
  { name: "reset_expires", type: "TEXT" },
];

let added = 0;
for (const col of NEW_COLUMNS) {
  if (existing.has(col.name)) {
    console.log(`♻️  Уже есть: ${col.name}`);
    continue;
  }
  db.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
  console.log(`✅ Добавлено: ${col.name} ${col.type}`);
  added++;
}

console.log(`\n🎉 Готово! Добавлено колонок: ${added}\n`);
db.close();
