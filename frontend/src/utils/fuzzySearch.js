import Fuse from "fuse.js";

/**
 * Настройки Fuse для фильмов.
 * Ищем по названию, оригинальному названию и режиссёру.
 */
const FUSE_OPTIONS = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "original_title", weight: 0.3 },
    { name: "director", weight: 0.15 },
    { name: "year", weight: 0.05 },
  ],
  threshold: 0.4, // 0 = точное совпадение, 1 = всё подряд. 0.4 = золотая середина
  distance: 100, // Максимальное расстояние между совпадениями
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true, // Искать в любом месте строки, а не только в начале
  useExtendedSearch: false,
  shouldSort: true,
};

/**
 * Создать Fuse-инстанс для массива фильмов.
 */
export function createFilmFuse(films) {
  return new Fuse(films, FUSE_OPTIONS);
}

/**
 * Нечёткий поиск по фильмам.
 * @param {Array} films — массив фильмов
 * @param {string} query — поисковый запрос
 * @returns {Array} — отфильтрованные фильмы, отсортированные по релевантности
 */
export function fuzzySearchFilms(films, query) {
  const q = (query || "").trim();
  if (!q || q.length < 2) return films;
  const fuse = createFilmFuse(films);
  return fuse.search(q).map((r) => r.item);
}

/**
 * Проверить, что fuzzy нашёл хоть что-то.
 * Если нет — вернуть пустой массив.
 */
export function hasFuzzyResults(films, query) {
  if (!query || query.trim().length < 2) return true;
  const fuse = createFilmFuse(films);
  return fuse.search(query).length > 0;
}

/**
 * Найти предложение "Возможно, вы имели в виду...".
 * Возвращает название самого релевантного фильма или null.
 */
export function getFuzzySuggestion(films, query) {
  const q = (query || "").trim();
  if (!q || q.length < 3) return null;
  const fuse = createFilmFuse(films);
  const results = fuse.search(q);
  if (results.length === 0) return null;
  // Если топ-результат имеет score > 0.4 — считаем, что это уже точное совпадение, не нужно предлагать
  if (results[0].score !== undefined && results[0].score < 0.15) return null;
  return {
    film: results[0].item,
    score: results[0].score,
  };
}
