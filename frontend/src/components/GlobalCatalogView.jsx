import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Loader2,
  X,
  Globe,
  Filter,
  ChevronLeft,
  ChevronRight,
  Film,
} from "lucide-react";
import { getCatalog } from "../services/api.js";
import MovieCard from "./MovieCard.jsx";

const PER_PAGE = 60;

export default function GlobalCatalogView({ onOpenDetail, onAddToLibrary }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null); // null | 'movie' | 'series'
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({
    films: [],
    total: 0,
    totalPages: 1,
    genres: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Загрузка
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCatalog({
      search: debouncedSearch,
      genre: genreFilter,
      type: typeFilter,
      sort,
      page,
      limit: PER_PAGE,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, genreFilter, typeFilter, sort, page]);

  const { films, total, totalPages, genres } = data;

  // Сброс фильтров
  const hasFilters = debouncedSearch || genreFilter || typeFilter;
  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setGenreFilter(null);
    setTypeFilter(null);
    setSort("rating");
    setPage(1);
  }

  function goToPage(p) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Клик по карточке
  function handleCardClick(film) {
    if (film.in_library) {
      // Уже в библиотеке — открываем детальную модалку
      onOpenDetail?.(film.id);
    } else {
      // Нет в библиотеке — открываем окно добавления с префиллом
      onAddToLibrary?.(film);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
          <Globe size={26} className="text-electric" />
          Каталог фильмов
        </h2>
        <p className="text-slate-400 text-sm">
          {total > 0
            ? `${total.toLocaleString("ru-RU")} фильмов и сериалов`
            : "Загрузка..."}
          {hasFilters && " · отфильтровано"}
        </p>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-electric pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название, режиссёр..."
          className="w-full bg-dark-card border border-dark-border rounded-xl
                     pl-12 pr-12 py-3 text-white placeholder-slate-500
                     focus:border-electric focus:shadow-neon transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                       hover:text-electric transition p-1"
            aria-label="Очистить"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Тип + сортировка */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <Filter size={14} />
          Тип:
        </div>
        {[
          { id: null, label: "Все" },
          { id: "movie", label: "Фильмы" },
          { id: "series", label: "Сериалы" },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() => {
              setTypeFilter(t.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        active:scale-95
                        ${
                          typeFilter === t.id
                            ? "bg-electric/15 border-electric text-electric shadow-neon"
                            : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                        }`}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Сортировка:</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5
                       text-xs text-white focus:border-electric transition cursor-pointer"
          >
            <option value="rating">По рейтингу</option>
            <option value="year_desc">Сначала новые</option>
            <option value="year_asc">Сначала старые</option>
            <option value="title">По названию (А-Я)</option>
          </select>
        </div>
      </div>

      {/* Жанры */}
      {genres.length > 0 && (
        <div className="w-full mb-5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pr-1 shrink-0">
              Жанр:
            </div>
            <button
              onClick={() => {
                setGenreFilter(null);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                          active:scale-95 whitespace-nowrap
                          ${
                            !genreFilter
                              ? "bg-electric/15 border-electric text-electric shadow-neon"
                              : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                          }`}
            >
              Все
            </button>
            {genres.map(({ name, count }) => {
              const active = genreFilter === name;
              return (
                <button
                  key={name}
                  onClick={() => {
                    setGenreFilter(active ? null : name);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                              border transition-all active:scale-95 whitespace-nowrap
                              ${
                                active
                                  ? "bg-electric/15 border-electric text-electric shadow-neon"
                                  : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                              }`}
                >
                  {name}
                  <span
                    className={`text-[10px] font-mono px-1 rounded
                                    ${active ? "bg-electric/20 text-electric" : "bg-white/5 text-slate-500"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Кнопка сброса фильтров */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400
                     hover:text-electric transition"
        >
          <X size={12} />
          Сбросить все фильтры
        </button>
      )}

      {/* Ошибка */}
      {error && (
        <div className="card p-4 mb-4 border-red-500/40 bg-red-500/5 text-red-300 text-sm">
          Ошибка: {error}
        </div>
      )}

      {/* Список */}
      {loading && films.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-electric animate-spin" />
        </div>
      ) : films.length === 0 ? (
        <div className="text-center py-16">
          <Film size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">Ничего не найдено</p>
          <p className="text-slate-500 text-sm">
            {hasFilters
              ? "Попробуй изменить фильтры или запрос"
              : "Каталог пуст"}
          </p>
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
                           gap-3 md:gap-4 transition-opacity
                           ${loading ? "opacity-50" : "opacity-100"}`}
          >
            {films.map((film) => (
              <MovieCard
                key={film.id}
                film={film}
                onClick={handleCardClick}
                onAdd={(f) => onAddToLibrary?.(f)}
                highlightQuery={debouncedSearch}
                showInLibraryBadge
              />
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={goToPage}
            />
          )}
        </>
      )}
    </>
  );
}

// ============================================================
// Пагинация
// ============================================================
function Pagination({ page, totalPages, onChange }) {
  const pages = useMemo(
    () => getPaginationRange(page, totalPages),
    [page, totalPages],
  );

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                     border border-dark-border text-slate-400
                     hover:border-electric/60 hover:text-electric
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:border-dark-border disabled:hover:text-slate-400
                     transition"
          aria-label="Предыдущая"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Назад</span>
        </button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`dots-${idx}`}
                className="px-2 text-slate-600 select-none"
              >
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[36px] px-2.5 py-2 rounded-lg text-xs font-mono font-semibold
                          border transition-all
                          ${
                            isActive
                              ? "bg-electric/15 border-electric text-electric shadow-neon"
                              : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/60 hover:text-white"
                          }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                     border border-dark-border text-slate-400
                     hover:border-electric/60 hover:text-electric
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:border-dark-border disabled:hover:text-slate-400
                     transition"
          aria-label="Следующая"
        >
          <span className="hidden sm:inline">Вперёд</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Страница {page} из {totalPages}
      </p>
    </div>
  );
}

function getPaginationRange(current, total) {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }
  const result = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) result.push(prev + 1);
      else if (i - prev > 2) result.push("...");
    }
    result.push(i);
    prev = i;
  }
  return result;
}
