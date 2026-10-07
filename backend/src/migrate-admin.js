import db from "./db.js";

// 1. Добавляем колонку is_admin, если её нет
const cols = db.prepare("PRAGMA table_info(users)").all();
const hasAdmin = cols.some((c) => c.name === "is_admin");

if (hasAdmin) {
  console.log("♻️  Колонка is_admin уже существует");
} else {
  db.prepare("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0").run();
  console.log("✅ Добавлена колонка is_admin INTEGER DEFAULT 0");
}

// 2. Назначаем админов по email
//    Список можно менять — здесь по умолчанию demo@cinevault.com
const ADMIN_EMAILS = ["demo@cinevault.com"];

const setAdmin = db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?");
const unsetAdmin = db.prepare(
  "UPDATE users SET is_admin = 0 WHERE email != ? AND is_admin = 1",
);

console.log("\n📋 Назначаю админов...\n");

// Сначала снимаем со всех, кроме первого из списка
if (ADMIN_EMAILS.length > 0) {
  unsetAdmin.run(ADMIN_EMAILS[0]);
}

for (const email of ADMIN_EMAILS) {
  const info = setAdmin.run(email);
  if (info.changes > 0) {
    console.log(`✅ ${email} — админ`);
  } else {
    console.log(`⚠️  ${email} — не найден в БД`);
  }
}

// Показываем всех юзеров с флагом
console.log("\n📊 Текущее состояние:\n");
const users = db
  .prepare("SELECT id, email, name, is_admin FROM users ORDER BY id")
  .all();
for (const u of users) {
  const mark = u.is_admin ? "👑" : "  ";
  console.log(`   ${mark} #${u.id}  ${u.email.padEnd(35)} ${u.name}`);
}

console.log("\n🎉 Готово!\n");
db.close();
