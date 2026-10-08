import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { value: "watched", label: "ПРОСМОТРЕНО", icon: Check },
  { value: "watching", label: "СМОТРЮ", icon: Play },
  { value: "planned", label: "В ПЛАНАХ", icon: Bookmark },
];

const SOURCES = [
  { value: "streaming", label: "СТРИМИНГ", icon: Tv },
  { value: "local", label: "ЛОКАЛЬНО", icon: HardDrive },
  { value: "physical", label: "НОСИТЕЛЬ", icon: Disc },
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
          .catch(() => {})
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm
                     flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full md:w-auto md:max-w-2xl bg-blood-card md:rounded-sm rounded-t-sm
                       border border-blood-border max-h-[95vh] md:max-h-[90vh]
                       flex flex-col overflow-hidden relative"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "110%", opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Красная верхняя полоса */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] z-30
                            bg-gradient-to-r from-transparent via-blood-accent to-transparent"
            />

            {/* Угловые акценты */}
            <div
              className="hidden md:block absolute top-0 left-0 w-8 h-8
                            border-l-2 border-t-2 border-blood-accent z-30"
            />
            <div
              className="hidden md:block absolute top-0 right-0 w-8 h-8
                            border-r-2 border-t-2 border-blood-accent z-30"
            />

            {/* Шапка */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-blood-border shrink-0">
              <div className="min-w-0">
                <h2 className="title-display text-2xl md:text-3xl text-white leading-none truncate">
                  {step === "search" ? "ДОБАВИТЬ ФИЛЬМ" : "ПРОВЕРЬ ДАННЫЕ"}
                </h2>
                <p className="text-[11px] text-blood-muted mt-1 font-mono uppercase tracking-wider">
                  {step === "search"
                    ? "Найди по названию или IMDb ID"
                    : "Заполни статус и источник"}
                </p>
              </div>
              <motion.button
                onClick={handleClose}
                disabled={saving}
                className="p-2 rounded-sm bg-black/60 text-blood-muted
                           border border-blood-border
                           hover:text-blood-accent hover:border-blood-accent hover:shadow-glow-sm
                           transition-all disabled:opacity-50 shrink-0"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Закрыть"
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <AnimatePresence mode="wait">
                {step === "search" && (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="relative">
                      <Search
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-accent pointer-events-none"
                      />
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Название фильма, сериала или IMDb ID (tt0816692)"
                        className="w-full bg-black/40 border border-blood-border rounded-sm
                                   pl-12 pr-12 py-3.5 text-white placeholder-blood-muted/50
                                   focus:border-blood-accent focus:shadow-glow-sm transition-all"
                      />
                      {searching && (
                        <Loader2
                          size={20}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-blood-accent animate-spin"
                        />
                      )}
                    </div>

                    {searchingImdb && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 text-[11px] text-blood-glow
                                   bg-blood-accent/10 border border-blood-accent/40 rounded-sm px-3 py-2
                                   uppercase tracking-wider font-mono"
                      >
                        <Sparkles size={14} />
                        Режим поиска по IMDb ID
                      </motion.div>
                    )}

                    {!query && (
                      <div className="mt-4 text-[11px] text-blood-muted leading-relaxed font-mono uppercase tracking-wider">
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
                              className="px-2.5 py-1 rounded-sm bg-black/40 border border-blood-border
                                         hover:border-blood-accent hover:text-blood-glow
                                         transition-all normal-case"
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchError && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-4 flex items-start gap-2 p-3 rounded-sm
                                   bg-blood-accent/10 border-l-2 border-blood-accent
                                   text-blood-glow text-sm"
                      >
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>{searchError}</p>
                      </motion.div>
                    )}

                    <div className="mt-4 space-y-2">
                      {results.map((item, i) => (
                        <motion.div
                          key={`${item.type}-${item.tmdb_id}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.15 }}
                        >
                          <SearchResultItem
                            item={item}
                            onClick={() => handleSelect(item)}
                            disabled={loadingDetails}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {query.length >= 2 &&
                      !searching &&
                      !searchError &&
                      results.length === 0 && (
                        <div className="text-center py-10">
                          <Film
                            size={40}
                            className="text-blood-muted/50 mx-auto mb-3"
                          />
                          <p className="text-blood-muted font-bold uppercase tracking-wider">
                            Ничего не найдено
                          </p>
                          <p className="text-blood-muted/70 text-sm mt-1">
                            Попробуй другое название или IMDb ID
                          </p>
                        </div>
                      )}

                    {loadingDetails && (
                      <div className="fixed inset-0 z-10 bg-black/70 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2
                            size={32}
                            className="text-blood-accent animate-spin"
                          />
                          <p className="text-white text-sm font-mono uppercase tracking-wider">
                            Загружаю детали...
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === "details" && selected && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Выбранный фильм */}
                    <div
                      className="flex gap-4 p-3 rounded-sm bg-black/40 border border-blood-accent/60
                                    shadow-glow-sm relative overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px]
                                      bg-gradient-to-r from-transparent via-blood-accent to-transparent"
                      />

                      <div
                        className="w-20 h-28 rounded-sm overflow-hidden shrink-0
                                      bg-black border border-blood-border relative"
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
                          <span
                            className="text-white font-bold text-xs text-center px-1 line-clamp-3
                                           flex items-center justify-center h-full"
                          >
                            {selected.title}
                          </span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blood-accent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <p className="title-display text-xl text-white flex-1 leading-tight line-clamp-2">
                            {selected.title}
                          </p>
                          {selected.type === "series" && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-sm shrink-0
                                             bg-blood-accent/15 text-blood-glow
                                             border border-blood-accent/60 uppercase tracking-wider"
                              style={{ fontFamily: "Bebas Neue, sans-serif" }}
                            >
                              Сериал
                            </span>
                          )}
                        </div>
                        {selected.original_title &&
                          selected.original_title !== selected.title && (
                            <p className="text-[11px] text-blood-muted truncate font-mono">
                              {selected.original_title}
                            </p>
                          )}
                        <p className="text-[11px] text-blood-muted mt-1 font-mono uppercase tracking-wider">
                          {selected.year || "—"}
                          {selected.director && ` · ${selected.director}`}
                          {selected.runtime && ` · ${selected.runtime} мин`}
                        </p>
                        {selected.tmdb_rating > 0 && (
                          <p
                            className="text-[11px] text-amber-400 mt-1 inline-flex items-center gap-1
                                        uppercase tracking-wider font-mono"
                          >
                            <Star size={10} fill="currentColor" />
                            {selected.tmdb_rating.toFixed(1)} на TMDB
                          </p>
                        )}
                      </div>
                    </div>

                    {loadingDetails && (
                      <div
                        className="mt-2 flex items-center gap-2 text-[11px] text-blood-accent
                                      uppercase tracking-wider font-mono"
                      >
                        <Loader2 size={12} className="animate-spin" />
                        Загружаю актёров...
                      </div>
                    )}

                    {selected.actors?.length > 0 && (
                      <div className="mt-4">
                        <p
                          className="text-[10px] text-blood-muted uppercase tracking-wider
                                      font-mono mb-2"
                        >
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
                                  className="w-12 h-12 rounded-sm object-cover border border-blood-border"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-sm bg-blood-accent/20 border border-blood-border
                                                flex items-center justify-center text-blood-glow text-xs font-bold"
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
                        className="text-[11px] text-blood-muted hover:text-blood-accent mt-2
                                   transition-colors uppercase tracking-wider font-mono
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
                            className="text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider
                                       bg-black/60 text-blood-muted border border-blood-border"
                            style={{ fontFamily: "Bebas Neue, sans-serif" }}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Статус */}
                    <div className="mt-5">
                      <label
                        className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                        font-mono mb-2 block"
                      >
                        Статус
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {STATUSES.map(({ value, label, icon: Icon }) => {
                          const isActive = status === value;
                          return (
                            <motion.button
                              key={value}
                              onClick={() => setStatus(value)}
                              disabled={saving}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-sm
                                          text-[11px] font-bold uppercase tracking-wider
                                          border transition-all duration-200
                                          disabled:opacity-50
                                          ${
                                            isActive
                                              ? "bg-blood-accent/15 border-blood-accent text-blood-glow shadow-glow-sm"
                                              : "bg-black/40 border-blood-border text-blood-muted hover:border-blood-accent/50"
                                          }`}
                              style={{
                                fontFamily: "Bebas Neue, sans-serif",
                                letterSpacing: "0.06em",
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Icon size={18} />
                              {label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Источник */}
                    <div className="mt-5">
                      <label
                        className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                        font-mono mb-2 block"
                      >
                        Источник
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {SOURCES.map(({ value, label, icon: Icon }) => {
                          const isActive = sourceType === value;
                          return (
                            <motion.button
                              key={value}
                              onClick={() => setSourceType(value)}
                              disabled={saving}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-sm
                                          text-[11px] font-bold uppercase tracking-wider
                                          border transition-all duration-200
                                          disabled:opacity-50
                                          ${
                                            isActive
                                              ? "bg-blood-accent/15 border-blood-accent text-blood-glow shadow-glow-sm"
                                              : "bg-black/40 border-blood-border text-blood-muted hover:border-blood-accent/50"
                                          }`}
                              style={{
                                fontFamily: "Bebas Neue, sans-serif",
                                letterSpacing: "0.06em",
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Icon size={18} />
                              {label}
                            </motion.button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder={SOURCE_PLACEHOLDERS[sourceType]}
                        disabled={saving}
                        className="w-full mt-2 bg-black/40 border border-blood-border rounded-sm
                                   px-4 py-2.5 text-sm text-white placeholder-blood-muted/50
                                   focus:border-blood-accent focus:shadow-glow-sm
                                   transition disabled:opacity-60"
                      />
                    </div>

                    {status === "watched" && (
                      <div className="mt-5">
                        <label
                          className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                          font-mono mb-3 block"
                        >
                          Моя оценка · 1-10
                        </label>
                        <RatingInput
                          value={rating}
                          onChange={setRating}
                          disabled={saving}
                        />
                      </div>
                    )}

                    {/* Теги */}
                    <div className="mt-5">
                      <label
                        className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                        font-mono mb-2 block"
                      >
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
                          className="flex-1 bg-black/40 border border-blood-border rounded-sm
                                     px-4 py-2.5 text-sm text-white placeholder-blood-muted/50
                                     focus:border-blood-accent focus:shadow-glow-sm transition
                                     disabled:opacity-60"
                        />
                        <motion.button
                          onClick={addTag}
                          disabled={!tagInput.trim() || saving}
                          className="px-4 rounded-sm border border-blood-border text-blood-muted
                                     hover:border-blood-accent hover:text-blood-glow
                                     disabled:opacity-40 disabled:cursor-not-allowed
                                     transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Plus size={16} />
                        </motion.button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1.5 text-[10px]
                                         bg-blood-accent/15 text-blood-glow border border-blood-accent/40
                                         rounded-sm px-2.5 py-1 uppercase tracking-wider"
                              style={{ fontFamily: "Bebas Neue, sans-serif" }}
                            >
                              {t}
                              <button
                                onClick={() => removeTag(t)}
                                disabled={saving}
                                className="hover:text-white transition disabled:opacity-50"
                                aria-label={`Убрать ${t}`}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {saveError && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-4 flex items-start gap-2 p-3 rounded-sm
                                   bg-blood-accent/10 border-l-2 border-blood-accent
                                   text-blood-glow text-sm"
                      >
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>{saveError}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Футер — только на шаге "детали" */}
            {step === "details" && selected && (
              <div
                className="p-4 md:p-5 border-t border-blood-border shrink-0
                              pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-5"
              >
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-blood w-full py-4 flex items-center justify-center gap-2 relative
                             overflow-hidden group disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span
                    className="absolute inset-0 hatch opacity-0 group-hover:opacity-100
                                   transition-opacity duration-300"
                  />
                  <span className="relative flex items-center gap-2">
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        СОХРАНЯЮ...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        ДОБАВИТЬ В КОЛЛЕКЦИЮ
                      </>
                    )}
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Карточка результата поиска
// ============================================================
function SearchResultItem({ item, onClick, disabled }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-sm
                 bg-black/40 hover:bg-blood-accent/5 border border-blood-border
                 hover:border-blood-accent/60 transition-all text-left
                 disabled:opacity-60 disabled:cursor-wait group"
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.99 }}
    >
      <div
        className="w-12 h-16 rounded-sm overflow-hidden shrink-0
                      bg-black border border-blood-border
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
          <span className="text-[10px] text-blood-muted font-bold text-center px-1 line-clamp-2 font-mono">
            {item.year || "—"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="title-display text-lg text-white truncate flex-1 leading-none">
            {item.title}
          </p>
          {item.type === "series" && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-sm shrink-0
                             bg-blood-accent/15 text-blood-glow border border-blood-accent/60
                             uppercase tracking-wider"
              style={{ fontFamily: "Bebas Neue, sans-serif" }}
            >
              Сериал
            </span>
          )}
        </div>
        {item.original_title && item.original_title !== item.title && (
          <p className="text-[11px] text-blood-muted truncate font-mono">
            {item.original_title}
          </p>
        )}
        <div
          className="flex items-center gap-2 mt-1 text-[10px] text-blood-muted
                        uppercase tracking-wider font-mono"
        >
          <span>{item.year || "—"}</span>
          {item.tmdb_rating > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400/80">
              <Star size={9} fill="currentColor" />
              {item.tmdb_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <Plus
        size={18}
        className="text-blood-muted group-hover:text-blood-accent
                                 transition-colors shrink-0"
      />
    </motion.button>
  );
}
