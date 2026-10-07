// Симуляция ответа от TMDB / Кинопоиск API.
// У каждого фильма указан tmdb_id — чтобы бэкенд мог найти реальный
// постер в уже импортированном каталоге или подтянуть его из TMDB.

const DATABASE = [
  {
    tmdb_id: 872585,
    title: "Оппенгеймер",
    original_title: "Oppenheimer",
    year: 2023,
    director: "Кристофер Нолан",
    genres: ["Драма", "История", "Триллер"],
    poster_url: null,
    description:
      "История американского физика Роберта Оппенгеймера, создателя атомной бомбы.",
    type: "movie",
  },
  {
    tmdb_id: 346698,
    title: "Барби",
    original_title: "Barbie",
    year: 2023,
    director: "Грета Гервиг",
    genres: ["Комедия", "Фэнтези", "Приключения"],
    poster_url: null,
    description:
      "Барби отправляется в реальный мир и сталкивается с его несовершенствами.",
    type: "movie",
  },
  {
    tmdb_id: 693134,
    title: "Дюна: Часть вторая",
    original_title: "Dune: Part Two",
    year: 2024,
    director: "Дени Вильнёв",
    genres: ["Фантастика", "Приключения"],
    poster_url: null,
    description:
      "Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам.",
    type: "movie",
  },
  {
    tmdb_id: 786892,
    title: "Фуриоса",
    original_title: "Furiosa",
    year: 2024,
    director: "Джордж Миллер",
    genres: ["Боевик", "Приключения", "Фантастика"],
    poster_url: null,
    description: "История Фуриосы до событий «Безумного Макса: Дороги ярости».",
    type: "movie",
  },
  {
    tmdb_id: 136315,
    title: "Медведь",
    original_title: "The Bear",
    year: 2022,
    director: "Кристофер Сторер",
    genres: ["Драма", "Комедия"],
    poster_url: null,
    description:
      "Молодой шеф-повар возвращается в Чикаго управлять семейным рестораном.",
    type: "series",
  },
  {
    tmdb_id: 100088,
    title: "Одни из нас",
    original_title: "The Last of Us",
    year: 2023,
    director: "Крейг Зибель",
    genres: ["Драма", "Ужасы", "Фантастика"],
    poster_url: null,
    description:
      "После глобальной пандемии Джоэл сопровождает девочку Элли через США.",
    type: "series",
  },
  {
    tmdb_id: 76479,
    title: "Пацаны",
    original_title: "The Boys",
    year: 2019,
    director: "Эрик Крипке",
    genres: ["Боевик", "Комедия", "Фантастика"],
    poster_url: null,
    description: "Отряд мстителей противостоит коррумпированным супергероям.",
    type: "series",
  },
  {
    tmdb_id: 76600,
    title: "Аватар: Путь воды",
    original_title: "Avatar: The Way of Water",
    year: 2022,
    director: "Джеймс Кэмерон",
    genres: ["Фантастика", "Приключения"],
    poster_url: null,
    description: "Семья Салли находит убежище у рифовых людей Пандоры.",
    type: "movie",
  },
  {
    tmdb_id: 466420,
    title: "Убийцы цветочной луны",
    original_title: "Killers of the Flower Moon",
    year: 2023,
    director: "Мартин Скорсезе",
    genres: ["Драма", "Криминал", "История"],
    poster_url: null,
    description:
      "Расследование серии убийств членов племени осейдж в 1920-х годах.",
    type: "movie",
  },
  {
    tmdb_id: 792307,
    title: "Бедные-несчастные",
    original_title: "Poor Things",
    year: 2023,
    director: "Йоргос Лантимос",
    genres: ["Комедия", "Драма", "Фэнтези"],
    poster_url: null,
    description: "Бела Baxter возвращается к жизни после эксперимента учёного.",
    type: "movie",
  },
];

/**
 * Симулирует поиск по TMDB API.
 */
export function searchFilms(query) {
  return new Promise((resolve) => {
    const delay = 400 + Math.random() * 300;
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (!q) return resolve([]);
      const results = DATABASE.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.original_title.toLowerCase().includes(q) ||
          f.director.toLowerCase().includes(q) ||
          f.genres.some((g) => g.toLowerCase().includes(q)),
      );
      resolve(results);
    }, delay);
  });
}
