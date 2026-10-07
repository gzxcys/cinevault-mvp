import bcrypt from "bcryptjs";
import db from "./db.js";

// ============================================================
// ДЕМО-ДАННЫЕ: 15 фильмов с жанрами и актёрами
// ============================================================

const FILMS = [
  {
    tmdb_id: 157336,
    title: "Интерстеллар",
    original_title: "Interstellar",
    year: 2014,
    director: "Кристофер Нолан",
    runtime: 169,
    tmdb_rating: 8.4,
    description:
      "Группа исследователей отправляется сквозь червоточину в поисках нового дома для человечества.",
    type: "movie",
    genres: ["Фантастика", "Драма", "Приключения"],
    actors: [
      { name: "Мэттью Макконахи", character: "Купер" },
      { name: "Энн Хэтэуэй", character: "Брэнд" },
      { name: "Джессика Честейн", character: "Мёрф" },
      { name: "Майкл Кейн", character: "Профессор Брэнд" },
      { name: "Маккензи Фой", character: "Мёрф (юная)" },
    ],
    // данные для user_films
    status: "watched",
    source_type: "streaming",
    source_name: "Netflix",
    user_rating: 5,
    tags: ["Для вечера", "Фантастика"],
    is_favorite: 1,
  },
  {
    tmdb_id: 27205,
    title: "Начало",
    original_title: "Inception",
    year: 2010,
    director: "Кристофер Нолан",
    runtime: 148,
    tmdb_rating: 8.4,
    description:
      "Вор, крадущий секреты из снов, получает задание внедрить идею в сознание человека.",
    type: "movie",
    genres: ["Фантастика", "Боевик", "Триллер"],
    actors: [
      { name: "Леонардо ДиКаприо", character: "Кобб" },
      { name: "Джозеф Гордон-Левитт", character: "Артур" },
      { name: "Эллен Пейдж", character: "Ариадна" },
      { name: "Том Харди", character: "Имс" },
      { name: "Киллиан Мёрфи", character: "Фишер" },
    ],
    status: "watched",
    source_type: "local",
    source_name: "/Movies/Inception.2010.1080p.mkv",
    user_rating: 5,
    tags: ["Пересмотреть"],
    is_favorite: 1,
  },
  {
    tmdb_id: 693134,
    title: "Дюна: Часть вторая",
    original_title: "Dune: Part Two",
    year: 2024,
    director: "Дени Вильнёв",
    runtime: 166,
    tmdb_rating: 8.2,
    description:
      "Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам, уничтожившим его семью.",
    type: "movie",
    genres: ["Фантастика", "Приключения"],
    actors: [
      { name: "Тимоти Шаламе", character: "Пол Атрейдес" },
      { name: "Зендея", character: "Чани" },
      { name: "Ребекка Фергюсон", character: "Леди Джессика" },
      { name: "Хавьер Бардем", character: "Стилгар" },
      { name: "Остин Батлер", character: "Фейд-Раута" },
    ],
    status: "planned",
    source_type: "streaming",
    source_name: "Кинопоиск",
    user_rating: null,
    tags: ["Долгожданное"],
    is_favorite: 0,
  },
  {
    tmdb_id: 872585,
    title: "Оппенгеймер",
    original_title: "Oppenheimer",
    year: 2023,
    director: "Кристофер Нолан",
    runtime: 181,
    tmdb_rating: 8.1,
    description:
      "История американского физика Роберта Оппенгеймера, создателя атомной бомбы.",
    type: "movie",
    genres: ["Драма", "История", "Триллер"],
    actors: [
      { name: "Киллиан Мёрфи", character: "Роберт Оппенгеймер" },
      { name: "Эмили Блант", character: "Китти" },
      { name: "Мэтт Дэймон", character: "Гроувз" },
      { name: "Роберт Дауни-младший", character: "Штраус" },
      { name: "Флоренс Пью", character: "Джин" },
    ],
    status: "watched",
    source_type: "streaming",
    source_name: "Netflix",
    user_rating: 5,
    tags: ["Оскар"],
    is_favorite: 1,
  },
  {
    tmdb_id: 545611,
    title: "Всё везде и сразу",
    original_title: "Everything Everywhere All at Once",
    year: 2022,
    director: "Дэниел Кван",
    runtime: 139,
    tmdb_rating: 7.8,
    description:
      "Женщина средних лет обнаруживает, что должна спасти мультивселенную.",
    type: "movie",
    genres: ["Фантастика", "Комедия", "Драма"],
    actors: [
      { name: "Мишель Йео", character: "Эвелин" },
      { name: "Джейми Ли Кёртис", character: "Дейдре" },
      { name: "Ке Хюи Куан", character: "Веймонд" },
      { name: "Стефани Сюй", character: "Джой" },
      { name: "Джеймс Хонг", character: "Гунг-Гунг" },
    ],
    status: "watched",
    source_type: "streaming",
    source_name: "Prime Video",
    user_rating: 4,
    tags: ["Странное"],
    is_favorite: 0,
  },
  {
    tmdb_id: 66732,
    title: "Очень странные дела",
    original_title: "Stranger Things",
    year: 2016,
    director: "Братья Даффер",
    runtime: 50,
    tmdb_rating: 8.6,
    description:
      "В городке Хоукинс пропадает мальчик, и его друзья сталкиваются с тайнами и сверхъестественными силами.",
    type: "series",
    genres: ["Фантастика", "Ужасы", "Драма"],
    actors: [
      { name: "Милли Бобби Браун", character: "Одиннадцать" },
      { name: "Финн Вулфхард", character: "Майк" },
      { name: "Вайнона Райдер", character: "Джойс" },
      { name: "Дэвид Харбор", character: "Хоппер" },
      { name: "Гейтен Матараццо", character: "Дастин" },
    ],
    status: "watching",
    source_type: "streaming",
    source_name: "Netflix",
    user_rating: 5,
    tags: ["Сериал", "Для вечера"],
    is_favorite: 1,
  },
  {
    tmdb_id: 335984,
    title: "Бегущий по лезвию 2049",
    original_title: "Blade Runner 2049",
    year: 2017,
    director: "Дени Вильнёв",
    runtime: 164,
    tmdb_rating: 7.6,
    description:
      "Офицер К изучает тайну, которая может обрушить остатки общества.",
    type: "movie",
    genres: ["Фантастика", "Драма", "Детектив"],
    actors: [
      { name: "Райан Гослинг", character: "К" },
      { name: "Харрисон Форд", character: "Деккард" },
      { name: "Ана де Армас", character: "Джой" },
      { name: "Сильвия Хукс", character: "Лав" },
      { name: "Джаред Лето", character: "Уоллес" },
    ],
    status: "watched",
    source_type: "physical",
    source_name: "Blu-ray",
    user_rating: 5,
    tags: ["Киберпанк"],
    is_favorite: 1,
  },
  {
    tmdb_id: 496243,
    title: "Паразиты",
    original_title: "Parasite",
    year: 2019,
    director: "Пон Джун Хо",
    runtime: 132,
    tmdb_rating: 8.5,
    description: "Бедная семья постепенно проникает в дом богатой семьи.",
    type: "movie",
    genres: ["Драма", "Триллер", "Комедия"],
    actors: [
      { name: "Сон Кан Хо", character: "Ки Тэк" },
      { name: "Ли Сон Гюн", character: "Пак Дон Ик" },
      { name: "Чо Ё Джон", character: "Ён Гё" },
      { name: "Чхве У Шик", character: "Ки У" },
      { name: "Пак Со Дам", character: "Ки Джон" },
    ],
    status: "watched",
    source_type: "local",
    source_name: "/Movies/Parasite.2019.mkv",
    user_rating: 5,
    tags: ["Оскар", "Корейское"],
    is_favorite: 1,
  },
  {
    tmdb_id: 475557,
    title: "Джокер",
    original_title: "Joker",
    year: 2019,
    director: "Тодд Филлипс",
    runtime: 122,
    tmdb_rating: 8.2,
    description:
      "История превращения неудачливого комика в легендарного злодея Готэма.",
    type: "movie",
    genres: ["Драма", "Триллер", "Криминал"],
    actors: [
      { name: "Хоакин Феникс", character: "Артур Флек" },
      { name: "Роберт Де Ниро", character: "Мюррей" },
      { name: "Зази Битц", character: "Софи" },
      { name: "Фрэнсис Конрой", character: "Пенни" },
      { name: "Бретт Каллен", character: "Томас Уэйн" },
    ],
    status: "watched",
    source_type: "streaming",
    source_name: "Кинопоиск",
    user_rating: 4,
    tags: ["Мрачное"],
    is_favorite: 0,
  },
  {
    tmdb_id: 82856,
    title: "Мандалорец",
    original_title: "The Mandalorian",
    year: 2019,
    director: "Джон Фавро",
    runtime: 45,
    tmdb_rating: 8.4,
    description:
      "Одинокий охотник за головами путешествует по дальним уголкам галактики.",
    type: "series",
    genres: ["Фантастика", "Боевик", "Приключения"],
    actors: [
      { name: "Педро Паскаль", character: "Мандалорец" },
      { name: "Джина Карано", character: "Кара Дюн" },
      { name: "Карл Уэзерс", character: "Гриф Карга" },
      { name: "Джанкарло Эспозито", character: "Мофф Гидеон" },
      { name: "Эмили Суоллоу", character: "Оружейница" },
    ],
    status: "watching",
    source_type: "streaming",
    source_name: "Disney+",
    user_rating: 5,
    tags: ["Сериал", "Звёздные войны"],
    is_favorite: 0,
  },
  {
    tmdb_id: 70523,
    title: "Тьма",
    original_title: "Dark",
    year: 2017,
    director: "Баран бо Одар",
    runtime: 55,
    tmdb_rating: 8.4,
    description:
      "Пропажа детей в немецком городке раскрывает тайну путешествий во времени.",
    type: "series",
    genres: ["Фантастика", "Триллер", "Драма"],
    actors: [
      { name: "Луис Хоффманн", character: "Йонас" },
      { name: "Лиза Викари", character: "Марта" },
      { name: "Мая Шёне", character: "Ханна" },
      { name: "Андреас Пичманн", character: "Ульрих" },
      { name: "Каролина Айхгорн", character: "Франциска" },
    ],
    status: "planned",
    source_type: "streaming",
    source_name: "Netflix",
    user_rating: null,
    tags: ["Сериал", "Загадка"],
    is_favorite: 0,
  },
  {
    tmdb_id: 150540,
    title: "Головоломка",
    original_title: "Inside Out",
    year: 2015,
    director: "Пит Доктер",
    runtime: 95,
    tmdb_rating: 7.9,
    description:
      "Эмоции девочки Райли оживают, когда её семья переезжает в новый город.",
    type: "movie",
    genres: ["Мультфильм", "Комедия", "Драма"],
    actors: [
      { name: "Эми Полер", character: "Радость (голос)" },
      { name: "Филлис Смит", character: "Печаль (голос)" },
      { name: "Билл Хейдер", character: "Страх (голос)" },
      { name: "Льюис Блэк", character: "Гнев (голос)" },
      { name: "Минди Калинг", character: "Брезгливость (голос)" },
    ],
    status: "watched",
    source_type: "local",
    source_name: "/Movies/Inside.Out.2015.mp4",
    user_rating: 5,
    tags: ["Для семьи", "Мультфильм"],
    is_favorite: 1,
  },
  {
    tmdb_id: 299534,
    title: "Мстители: Финал",
    original_title: "Avengers: Endgame",
    year: 2019,
    director: "Братья Руссо",
    runtime: 181,
    tmdb_rating: 8.3,
    description:
      "Мстители пытаются отменить действия Таноса и восстановить вселенную.",
    type: "movie",
    genres: ["Фантастика", "Боевик", "Приключения"],
    actors: [
      { name: "Роберт Дауни-младший", character: "Тони Старк" },
      { name: "Крис Эванс", character: "Стив Роджерс" },
      { name: "Марк Руффало", character: "Брюс Бэннер" },
      { name: "Крис Хемсворт", character: "Тор" },
      { name: "Скарлетт Йоханссон", character: "Наташа" },
    ],
    status: "watched",
    source_type: "streaming",
    source_name: "Disney+",
    user_rating: 4,
    tags: ["Marvel"],
    is_favorite: 0,
  },
  {
    tmdb_id: 238,
    title: "Крёстный отец",
    original_title: "The Godfather",
    year: 1972,
    director: "Фрэнсис Форд Коппола",
    runtime: 175,
    tmdb_rating: 8.7,
    description:
      "История семьи Корлеоне — одной из самых влиятельных мафиозных династий Нью-Йорка.",
    type: "movie",
    genres: ["Драма", "Криминал"],
    actors: [
      { name: "Марлон Брандо", character: "Дон Вито Корлеоне" },
      { name: "Аль Пачино", character: "Майкл Корлеоне" },
      { name: "Джеймс Каан", character: "Сонни Корлеоне" },
      { name: "Роберт Дювалл", character: "Том Хейген" },
      { name: "Дайан Китон", character: "Кей Адамс" },
    ],
    status: "watched",
    source_type: "physical",
    source_name: "DVD",
    user_rating: 5,
    tags: ["Классика"],
    is_favorite: 1,
  },
  {
    tmdb_id: 4935,
    title: "Ходячий замок",
    original_title: "Howl's Moving Castle",
    year: 2004,
    director: "Хаяо Миядзаки",
    runtime: 119,
    tmdb_rating: 8.4,
    description:
      "Девочка Софи проклята ведьмой и находит приют в ходячем замке волшебника Хаула.",
    type: "movie",
    genres: ["Мультфильм", "Фэнтези", "Приключения"],
    actors: [
      { name: "Тиэко Байсё", character: "Софи (голос)" },
      { name: "Такуя Кимура", character: "Хаул (голос)" },
      { name: "Акихиро Мива", character: "Маркл (голос)" },
      { name: "Ё Оидзуми", character: "Кальцифер (голос)" },
      { name: "Рюноскэ Камики", character: "Принц Джастин (голос)" },
    ],
    status: "planned",
    source_type: "streaming",
    source_name: "Netflix",
    user_rating: null,
    tags: ["Для семьи", "Аниме"],
    is_favorite: 0,
  },
];

// ============================================================
// ДЕМО-ПОЛЬЗОВАТЕЛИ (для теста рекомендаций)
// ============================================================

const USERS = [
  {
    email: "demo@cinevault.com",
    name: "Демо Пользователь",
    password: "demo123",
  },
  {
    email: "nolan.fan@cinevault.com",
    name: "Фанат Нолана",
    password: "demo123",
  },
  {
    email: "anime.lover@cinevault.com",
    name: "Анимешник",
    password: "demo123",
  },
  {
    email: "classic@cinevault.com",
    name: "Ценитель классики",
    password: "demo123",
  },
];

// ============================================================
// ЛОГИКА СИДИРОВАНИЯ
// ============================================================

function seed() {
  console.log("🌱 Начинаю наполнение БД...\n");

  // Чистим всё (в правильном порядке, чтобы не сломать foreign key)
  db.exec(`
    DELETE FROM user_films;
    DELETE FROM film_genres;
    DELETE FROM film_people;
    DELETE FROM films;
    DELETE FROM genres;
    DELETE FROM people;
    DELETE FROM users;
  `);

  // ---------- 1. Пользователи ----------
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, email_verified)
    VALUES (@email, @password_hash, @name, 1)
  `);

  const userIds = {};
  for (const u of USERS) {
    const hash = bcrypt.hashSync(u.password, 10);
    const info = insertUser.run({
      email: u.email,
      password_hash: hash,
      name: u.name,
    });
    userIds[u.email] = info.lastInsertRowid;
  }
  console.log(`✅ Создано пользователей: ${USERS.length}`);

  // ---------- 2. Жанры ----------
  const allGenres = new Set();
  for (const f of FILMS) for (const g of f.genres) allGenres.add(g);

  const insertGenre = db.prepare("INSERT INTO genres (name) VALUES (?)");
  const genreIds = {};
  for (const g of allGenres) {
    const info = insertGenre.run(g);
    genreIds[g] = info.lastInsertRowid;
  }
  console.log(`✅ Создано жанров: ${allGenres.size}`);

  // ---------- 3. Фильмы ----------
  const insertFilm = db.prepare(`
    INSERT INTO films (tmdb_id, title, original_title, year, director,
                       poster_url, description, type, runtime, tmdb_rating)
    VALUES (@tmdb_id, @title, @original_title, @year, @director,
            @poster_url, @description, @type, @runtime, @tmdb_rating)
  `);

  const linkGenre = db.prepare(
    "INSERT INTO film_genres (film_id, genre_id) VALUES (?, ?)",
  );

  const filmIds = [];
  for (const f of FILMS) {
    const info = insertFilm.run({
      tmdb_id: f.tmdb_id,
      title: f.title,
      original_title: f.original_title,
      year: f.year,
      director: f.director,
      poster_url: null, // заполним скриптом импорта TMDB позже
      description: f.description,
      type: f.type,
      runtime: f.runtime,
      tmdb_rating: f.tmdb_rating,
    });
    const filmId = info.lastInsertRowid;
    filmIds.push(filmId);

    for (const g of f.genres) {
      linkGenre.run(filmId, genreIds[g]);
    }
  }
  console.log(`✅ Создано фильмов: ${FILMS.length}`);

  // ---------- 4. Люди (актёры + режиссёры) ----------
  const insertPerson = db.prepare(
    "INSERT OR IGNORE INTO people (name) VALUES (?)",
  );
  const getPersonId = db.prepare("SELECT id FROM people WHERE name = ?");
  const linkFilmPerson = db.prepare(`
    INSERT OR IGNORE INTO film_people (film_id, person_id, role, character, order_index)
    VALUES (?, ?, ?, ?, ?)
  `);

  const personIds = {};
  for (const f of FILMS) {
    // Режиссёр
    insertPerson.run(f.director);
    const dirId = getPersonId.get(f.director).id;
    personIds[f.director] = dirId;

    // Актёры
    for (const a of f.actors) {
      insertPerson.run(a.name);
      personIds[a.name] = getPersonId.get(a.name).id;
    }
  }

  // Связываем фильмы с людьми
  for (let i = 0; i < FILMS.length; i++) {
    const f = FILMS[i];
    const filmId = filmIds[i];

    // Режиссёр
    linkFilmPerson.run(filmId, personIds[f.director], "director", null, 0);

    // Актёры
    f.actors.forEach((a, idx) => {
      linkFilmPerson.run(filmId, personIds[a.name], "actor", a.character, idx);
    });
  }
  console.log(`✅ Создано людей: ${Object.keys(personIds).length}`);

  // ---------- 5. Личная библиотека демо-юзера ----------
  const demoUserId = userIds["demo@cinevault.com"];
  const insertUserFilm = db.prepare(`
    INSERT INTO user_films (user_id, film_id, status, is_favorite,
                            source_type, source_name, user_rating, tags)
    VALUES (@user_id, @film_id, @status, @is_favorite,
            @source_type, @source_name, @user_rating, @tags)
  `);

  for (let i = 0; i < FILMS.length; i++) {
    const f = FILMS[i];
    insertUserFilm.run({
      user_id: demoUserId,
      film_id: filmIds[i],
      status: f.status,
      is_favorite: f.is_favorite,
      source_type: f.source_type,
      source_name: f.source_name,
      user_rating: f.user_rating,
      tags: JSON.stringify(f.tags),
    });
  }
  console.log(`✅ Демо-юзеру добавлено фильмов: ${FILMS.length}`);

  console.log("\n🎉 Готово!\n");
  console.log("📧 Демо-аккаунт:");
  console.log("   Email:  demo@cinevault.com");
  console.log("   Пароль: demo123\n");
  console.log("📧 Дополнительные тестовые аккаунты (пароль demo123):");
  USERS.slice(1).forEach((u) => console.log(`   ${u.email}`));
}

seed();
db.close();
