import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Loader2,
  Check,
  Play,
  Bookmark,
  Tv,
  HardDrive,
  Disc,
  Star,
  Plus,
  AlertCircle,
  Film,
  Sparkles,
} from "lucide-react";
import { searchTmdb, findByImdb, getTmdbDetails } from "../services/tmdb.js";
import { createFilm, getCatalogFilm } from "../services/api.js";
import RatingInput from "./RatingInput.jsx";

const STATUSES = [
  { value: "watched", label: "Просмотрено", icon: Check },
  { value: "watching", label: "Смотрю", icon: Play },
  { value: "planned", label: "В планах", icon: Bookmark },
];

const SOURCES = [
  { value: "streaming", label: "Стриминг", icon: Tv },
  { value: "local", label: "Локально", icon: HardDrive },
  { value: "physical", label: "Носитель", icon: Disc },
];

const SOURCE_PLACEHOLDERS = {
  streaming: "Netflix, Кинопоиск, Okko...",
  local: "/Movies/Inception.2010.mkv",
  physical: "DVD, Blu-ray, VHS...",
};

function isImdbId(q) {
  return /^tt\d{5,}$/i.test(q.trim());
}

export default function AddMovieModal({ open, onClose, onAdded, prefillFilm }) {
  const [step, setStep] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [status, setStatus] = useState("watched");
  const [sourceType, setSourceType] = useState("streaming");
  const [sourceName, setSourceName] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const inputRef = useRef(null);
  const searchAbortRef = useRef(0);

  useEffect(() => {
    if (open) {
      if (prefillFilm) {
        // Показываем шаг "детали" сразу с базовой инфой
        setSelected({
          tmdb_id: prefillFilm.tmdb_id,
          type: prefillFilm.type,
          title: prefillFilm.title,
          original_title: prefillFilm.original_title,
          year: prefillFilm.year,
          director: prefillFilm.director,
          poster_url: prefillFilm.poster_url,
          description: prefillFilm.description,
          tmdb_rating: prefillFilm.tmdb_rating,
          runtime: prefillFilm.runtime,
          genres: prefillFilm.genres || [],
          actors: [],
          directors: [],
        });
        setStep("details");
        setQuery("");
        setResults([]);

        // Асинхронно подтягиваем актёров и режиссёров
        setLoadingDetails(true);
        getCatalogFilm(prefillFilm.id)
          .then((full) => {
            setSelected((s) => ({
              ...s,
              genres: full.genres || s.genres,
              actors: full.actors || [],
              directors: full.directors || [],
            }));
          })
          .catch(() => {
            /* не критично — детали не подтянулись */
          })
          .finally(() => setLoadingDetails(false));
      } else {
        setStep("search");
        setQuery("");
        setResults([]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      setSearchError(null);
      setSaveError(null);
      setStatus("watched");
      setSourceType("streaming");
      setSourceName("");
      setRating(0);
      setTags([]);
      setTagInput("");
    }
  }, [open, prefillFilm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== "search") return;
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const requestId = ++searchAbortRef.current;

    const timer = setTimeout(async () => {
      try {
        let data;
        if (isImdbId(q)) {
          data = await findByImdb(q);
        } else {
          data = await searchTmdb(q);
        }
        if (requestId !== searchAbortRef.current) return;
        setResults(data.results || []);
      } catch (err) {
        if (requestId !== searchAbortRef.current) return;
        setSearchError(err.message);
        setResults([]);
      } finally {
        if (requestId === searchAbortRef.current) setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, open, step]);

  if (!open) return null;

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSelect(item) {
    setLoadingDetails(true);
    setSaveError(null);
    try {
      const details = await getTmdbDetails(
        item.type === "series" ? "tv" : "movie",
        item.tmdb_id,
      );
      setSelected({ ...details, type: item.type });
      setStep("details");
    } catch (err) {
      setSelected({
        tmdb_id: item.tmdb_id,
        type: item.type,
        title: item.title,
        original_title: item.original_title,
        year: item.year,
        poster_url: item.poster_url,
        description: item.description,
        tmdb_rating: item.tmdb_rating,
        genres: [],
        actors: [],
        director: null,
      });
      setStep("details");
      setSaveError("Не удалось загрузить детали: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  }

  function handleBackToSearch() {
    setSelected(null);
    setStep("search");
    setSaveError(null);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        tmdb_id: selected.tmdb_id,
        title: selected.title,
        original_title: selected.original_title,
        year: selected.year,
        director: selected.director,
        genres: selected.genres || [],
        poster_url: selected.poster_url,
        description: selected.description,
        type: selected.type,
        status,
        source_type: sourceType,
        source_name: sourceName || null,
        user_rating: status === "watched" ? rating || null : null,
        tags,
      };

      const created = await createFilm(payload);
      onAdded?.(created);
      handleClose();
    } catch (err) {
      if (err.message.includes("уже в твоей библиотеке")) {
        setSaveError("Этот фильм уже есть в твоей библиотеке");
      } else {
        setSaveError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const searchingImdb = isImdbId(query);
  const canGoBackToSearch = step === "details" && !prefillFilm;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="w-full md:max-w-2xl bg-dark-card md:rounded-2xl rounded-t-2xl
                   border border-dark-border max-h-[95vh] md:max-h-[90vh]
                   flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-dark-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold truncate">
              {step === "search" ? "Добавить в коллекцию" : "Проверь данные"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === "search"
                ? "Найди по названию или IMDb ID"
                : "Заполни статус и источник"}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5
                       transition disabled:opacity-50 shrink-0"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {step === "search" && (
            <>
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-electric pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Название фильма, сериала или IMDb ID (tt0816692)"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl
                             pl-12 pr-12 py-3.5 text-white placeholder-slate-500
                             focus:border-electric focus:shadow-neon transition-all"
                />
                {searching && (
                  <Loader2
                    size={20}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-electric animate-spin"
                  />
                )}
              </div>

              {searchingImdb && (
                <div
                  className="mt-3 flex items-center gap-2 text-xs text-electric
                                bg-electric/10 border border-electric/30 rounded-lg px-3 py-2"
                >
                  <Sparkles size={14} />
                  Режим поиска по IMDb ID
                </div>
              )}

              {!query && (
                <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                  <p className="mb-2">Попробуй:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Интерстеллар",
                      "Нолан",
                      "Мастер и Маргарита",
                      "tt0816692",
                    ].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => setQuery(hint)}
                        className="px-2.5 py-1 rounded-lg bg-dark-bg border border-dark-border
                                   hover:border-electric/40 hover:text-electric transition"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchError && (
                <div
                  className="mt-4 flex items-start gap-2 p-3 rounded-lg
                                bg-red-500/10 border border-red-500/40 text-red-300 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{searchError}</p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {results.map((item) => (
                  <SearchResultItem
                    key={`${item.type}-${item.tmdb_id}`}
                    item={item}
                    onClick={() => handleSelect(item)}
                    disabled={loadingDetails}
                  />
                ))}
              </div>

              {query.length >= 2 &&
                !searching &&
                !searchError &&
                results.length === 0 && (
                  <div className="text-center py-10">
                    <Film size={40} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">
                      Ничего не найдено
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      Попробуй другое название или IMDb ID
                    </p>
                  </div>
                )}

              {loadingDetails && (
                <div className="fixed inset-0 z-10 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-electric animate-spin" />
                    <p className="text-white text-sm">Загружаю детали...</p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "details" && selected && (
            <>
              <div className="flex gap-4 p-3 rounded-xl bg-dark-bg border border-electric/30 shadow-neon">
                <div
                  className="w-20 h-28 rounded-md overflow-hidden shrink-0
                                bg-gradient-to-br from-electric to-purple-600
                                flex items-center justify-center"
                >
                  {selected.poster_url ? (
                    <img
                      src={selected.poster_url}
                      alt={selected.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-white font-bold text-xs text-center px-1 line-clamp-3">
                      {selected.title}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <p className="font-semibold text-white flex-1 line-clamp-2">
                      {selected.title}
                    </p>
                    {selected.type === "series" && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full shrink-0
                                       bg-electric/10 text-electric border border-electric/40"
                      >
                        Сериал
                      </span>
                    )}
                  </div>
                  {selected.original_title &&
                    selected.original_title !== selected.title && (
                      <p className="text-xs text-slate-400 truncate">
                        {selected.original_title}
                      </p>
                    )}
                  <p className="text-xs text-slate-400 mt-1">
                    {selected.year || "—"}
                    {selected.director && ` · ${selected.director}`}
                    {selected.runtime && ` · ${selected.runtime} мин`}
                  </p>
                  {selected.tmdb_rating > 0 && (
                    <p className="text-xs text-amber-400 mt-1 inline-flex items-center gap-1">
                      <Star size={12} fill="currentColor" />
                      {selected.tmdb_rating.toFixed(1)} на TMDB
                    </p>
                  )}
                </div>
              </div>

              {/* Индикатор загрузки деталей */}
              {loadingDetails && (
                <div className="mt-2 flex items-center gap-2 text-xs text-electric">
                  <Loader2 size={12} className="animate-spin" />
                  Загружаю актёров...
                </div>
              )}

              {/* Актёры (если подтянулись) */}
              {selected.actors?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                    В ролях
                  </p>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {selected.actors.slice(0, 10).map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col items-center gap-1.5 shrink-0 w-16"
                      >
                        {a.profile_url ? (
                          <img
                            src={a.profile_url}
                            alt={a.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-dark-border"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full bg-electric/20 border-2 border-dark-border
                                          flex items-center justify-center text-electric text-xs font-bold"
                          >
                            {a.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                        )}
                        <p className="text-[10px] text-white text-center leading-tight line-clamp-2">
                          {a.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canGoBackToSearch && (
                <button
                  onClick={handleBackToSearch}
                  disabled={saving}
                  className="text-xs text-slate-400 hover:text-electric mt-2 transition
                             disabled:opacity-50"
                >
                  ← Найти другой фильм
                </button>
              )}

              {selected.genres?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selected.genres.map((g) => (
                    <span
                      key={g}
                      className="text-[11px] px-2 py-0.5 rounded-full
                                 bg-white/5 text-slate-300 border border-white/10"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                  Статус
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setStatus(value)}
                      disabled={saving}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl
                                  border transition-all text-xs font-medium active:scale-95
                                  disabled:opacity-50
                                  ${
                                    status === value
                                      ? "bg-electric/10 border-electric text-electric shadow-neon"
                                      : "bg-dark-bg border-dark-border text-slate-400 hover:border-electric/40"
                                  }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                  Источник
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSourceType(value)}
                      disabled={saving}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl
                                  border transition-all text-xs font-medium active:scale-95
                                  disabled:opacity-50
                                  ${
                                    sourceType === value
                                      ? "bg-electric/10 border-electric text-electric shadow-neon"
                                      : "bg-dark-bg border-dark-border text-slate-400 hover:border-electric/40"
                                  }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder={SOURCE_PLACEHOLDERS[sourceType]}
                  disabled={saving}
                  className="w-full mt-2 bg-dark-bg border border-dark-border rounded-xl
                             px-4 py-2.5 text-sm text-white placeholder-slate-500
                             focus:border-electric transition disabled:opacity-60"
                />
              </div>

              {status === "watched" && (
                <div className="mt-5">
                  <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                    Моя оценка{" "}
                    <span className="text-slate-500 normal-case">(1-10)</span>
                  </label>
                  <RatingInput
                    value={rating}
                    onChange={setRating}
                    disabled={saving}
                  />
                </div>
              )}

              <div className="mt-5">
                <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                  Теги
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    disabled={saving}
                    placeholder="Для вечера, Хоррор на Хэллоуин..."
                    className="flex-1 bg-dark-bg border border-dark-border rounded-xl
                               px-4 py-2.5 text-sm text-white placeholder-slate-500
                               focus:border-electric transition disabled:opacity-60"
                  />
                  <button
                    onClick={addTag}
                    disabled={!tagInput.trim() || saving}
                    className="btn-ghost px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 text-xs
                                   bg-electric/10 text-electric border border-electric/40
                                   rounded-full px-3 py-1"
                      >
                        {t}
                        <button
                          onClick={() => removeTag(t)}
                          disabled={saving}
                          className="hover:text-white transition disabled:opacity-50"
                          aria-label={`Убрать ${t}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {saveError && (
                <div
                  className="mt-4 flex items-start gap-2 p-3 rounded-lg
                                bg-red-500/10 border border-red-500/40 text-red-300 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{saveError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {step === "details" && selected && (
          <div
            className="p-4 md:p-5 border-t border-dark-border shrink-0
                          pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-5"
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-electric w-full py-3.5 flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Сохраняю...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Добавить в коллекцию
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({ item, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl
                 bg-dark-bg hover:bg-electric/5 border border-dark-border
                 hover:border-electric/40 transition-all text-left
                 active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait"
    >
      <div
        className="w-12 h-16 rounded-md overflow-hidden shrink-0
                      bg-gradient-to-br from-electric/20 to-purple-500/20
                      flex items-center justify-center relative"
      >
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <span className="text-xs text-white/60 font-bold text-center px-1 line-clamp-2">
            {item.year || "—"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm text-white truncate flex-1">
            {item.title}
          </p>
          {item.type === "series" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded
                             bg-electric/10 text-electric border border-electric/40 shrink-0"
            >
              Сериал
            </span>
          )}
        </div>
        {item.original_title && item.original_title !== item.title && (
          <p className="text-xs text-slate-400 truncate">
            {item.original_title}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
          <span>{item.year || "—"}</span>
          {item.tmdb_rating > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400/80">
              <Star size={10} fill="currentColor" />
              {item.tmdb_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <Plus size={18} className="text-electric shrink-0" />
    </button>
  );
}
