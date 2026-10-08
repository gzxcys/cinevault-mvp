import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  Play,
  Clock,
  Bookmark,
  Check,
  Heart,
  ExternalLink,
  Calendar,
  Loader2,
  Tag,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  getFilm,
  getFilmProviders,
  updateFilm,
  deleteFilm,
} from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { SOURCES_LIST } from "../utils/sources.js";
import RatingInput from "./RatingInput.jsx";
import WhereToWatch from "./WhereToWatch.jsx";
import EditMetadataModal from "./EditMetadataModal.jsx";

const STATUSES = [
  {
    value: "watched",
    label: "ПРОСМОТРЕНО",
    icon: Check,
    color: "text-emerald-400",
  },
  { value: "watching", label: "СМОТРЮ", icon: Play, color: "text-blood-glow" },
  {
    value: "planned",
    label: "В ПЛАНАХ",
    icon: Bookmark,
    color: "text-amber-400",
  },
];

const SOURCE_LABELS = {
  streaming: "Стриминг",
  local: "Локальный файл",
  physical: "Физический носитель",
};

const PROVIDER_TYPE_LABELS = {
  subscription: "По подписке",
  free: "Бесплатно",
  ads: "С рекламой",
  rent: "Аренда",
  buy: "Покупка",
};

function Avatar({ name, url, size = "md" }) {
  const sizes = {
    sm: "w-10 h-10 text-xs",
    md: "w-14 h-14 text-sm",
    lg: "w-20 h-20 text-base",
  };
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const GRADS = [
    "from-blood-accent to-blood-dim",
    "from-red-700 to-red-900",
    "from-blood-glow to-blood-accent",
    "from-rose-600 to-red-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const grad = GRADS[Math.abs(hash) % GRADS.length];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizes[size]} rounded-sm object-cover border border-blood-border`}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-sm bg-gradient-to-br ${grad}
                    flex items-center justify-center font-bold text-white
                    border border-blood-border shrink-0`}
    >
      {initials}
    </div>
  );
}

export default function MovieDetailModal({
  filmId,
  open,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);

  const [film, setFilm] = useState(null);
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSource, setEditingSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState({
    type: "streaming",
    name: "",
  });
  const [showEditMetadata, setShowEditMetadata] = useState(false);

  useEffect(() => {
    if (!open || !filmId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFilm(null);
    setConfirmDelete(false);
    setEditingSource(false);
    setShowEditMetadata(false);

    getFilm(filmId)
      .then((data) => {
        if (!cancelled) setFilm(data);
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
  }, [filmId, open]);

  useEffect(() => {
    if (!open || !filmId) return;
    let cancelled = false;
    setProvidersLoading(true);
    setProviders(null);

    getFilmProviders(filmId)
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) setProviders({ providers: [] });
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filmId, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  async function patchFilm(updates) {
    if (!film) return;
    const prev = { ...film };
    setFilm({ ...film, ...updates });
    setUpdating(true);
    try {
      const updated = await updateFilm(film.id, updates);
      setFilm((f) => ({ ...f, ...updated }));
      onUpdated?.(updated);
    } catch (e) {
      setFilm(prev);
      alert("Не удалось обновить: " + e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!film) return;
    setDeleting(true);
    try {
      await deleteFilm(film.id);
      onDeleted?.(film.id);
      onClose();
    } catch (e) {
      alert("Не удалось удалить: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function saveSource() {
    if (!film) return;
    await patchFilm({
      source_type: sourceDraft.type,
      source_name: sourceDraft.name.trim() || null,
    });
    setEditingSource(false);
  }

  function handleMetadataSaved(updatedFilm) {
    setFilm((f) => ({ ...f, ...updatedFilm }));
    onUpdated?.(updatedFilm);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm
                       flex items-end md:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
          >
            <motion.div
              className="w-full md:max-w-4xl bg-blood-card md:rounded-sm rounded-t-sm
                         border border-blood-border max-h-[95vh] md:max-h-[90vh]
                         flex flex-col overflow-hidden relative"
              initial={{ y: "110%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "110%", opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
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

              {/* Верхние кнопки */}
              <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
                {film && (
                  <>
                    {isAdmin && (
                      <motion.button
                        onClick={() => setShowEditMetadata(true)}
                        className="p-2 rounded-sm bg-black/80 backdrop-blur text-blood-muted
                                   border border-blood-border
                                   hover:text-blood-accent hover:border-blood-accent hover:shadow-glow-sm
                                   transition-all"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Редактировать метаданные (админ)"
                      >
                        <Pencil size={16} />
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => setConfirmDelete(true)}
                      className="p-2 rounded-sm bg-black/80 backdrop-blur text-blood-muted
                                 border border-blood-border
                                 hover:text-blood-glow hover:border-blood-accent hover:shadow-glow-sm
                                 transition-all"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Удалить из коллекции"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </>
                )}
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-sm bg-black/80 backdrop-blur text-white
                             border border-blood-border
                             hover:bg-blood-accent hover:border-blood-accent
                             transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Подтверждение удаления */}
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="bg-blood-card rounded-sm p-6 max-w-sm w-full
                                 border border-blood-accent/50 relative"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px]
                                      bg-blood-accent shadow-glow"
                      />
                      <h3 className="title-display text-2xl text-blood-glow mb-2">
                        УДАЛИТЬ ИЗ КОЛЛЕКЦИИ?
                      </h3>
                      <p className="text-sm text-blood-muted mb-5">
                        Фильм{" "}
                        <span className="text-white font-medium">
                          «{film?.title}»
                        </span>{" "}
                        пропадёт из твоей библиотеки. Он останется в глобальном
                        каталоге.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="btn-ghost flex-1 py-2.5 disabled:opacity-50 text-sm"
                        >
                          Отмена
                        </button>
                        <motion.button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 py-2.5 rounded-sm bg-blood-accent text-white
                                     flex items-center justify-center gap-2
                                     hover:bg-blood-glow shadow-glow
                                     disabled:opacity-60"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {deleting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={16} />
                              <span className="title-display text-base">
                                УДАЛИТЬ
                              </span>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2
                      size={32}
                      className="text-blood-accent animate-spin"
                    />
                    <p className="text-blood-muted text-sm font-mono uppercase tracking-wider">
                      Загрузка...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-6 text-center">
                    <p className="text-blood-glow">Ошибка: {error}</p>
                  </div>
                )}

                {film && (
                  <>
                    {/* ============ ОБЛОЖКА ============ */}
                    <div className="relative">
                      {film.poster_url && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-15 blur-3xl"
                          style={{ backgroundImage: `url(${film.poster_url})` }}
                        />
                      )}
                      <div className="relative p-4 md:p-8 flex gap-4 md:gap-6">
                        <div
                          className="w-32 md:w-48 shrink-0 rounded-sm overflow-hidden
                                        bg-black border border-blood-border shadow-blood relative"
                        >
                          {film.poster_url ? (
                            <img
                              src={film.poster_url}
                              alt={film.title}
                              className="w-full aspect-[2/3] object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] flex items-center justify-center p-2 text-center">
                              <span className="text-white font-bold text-sm">
                                {film.title}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blood-accent" />
                        </div>

                        <div className="flex-1 min-w-0 pr-24 md:pr-32">
                          <h2 className="title-display text-3xl md:text-5xl text-white leading-none mb-2">
                            {film.title}
                          </h2>
                          {film.original_title &&
                            film.original_title !== film.title && (
                              <p className="text-sm text-blood-muted mt-1 font-mono">
                                {film.original_title}
                              </p>
                            )}

                          <div
                            className="flex flex-wrap items-center gap-3 mt-4 text-xs
                                          text-blood-muted uppercase tracking-wider font-mono"
                          >
                            {film.year && (
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar
                                  size={13}
                                  className="text-blood-accent"
                                />
                                {film.year}
                              </span>
                            )}
                            {film.runtime > 0 && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock
                                  size={13}
                                  className="text-blood-accent"
                                />
                                {film.runtime} мин
                              </span>
                            )}
                            {film.type === "series" && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-sm
                                               bg-blood-accent/15 text-blood-glow
                                               border border-blood-accent/60"
                              >
                                СЕРИАЛ
                              </span>
                            )}
                          </div>

                          {film.tmdb_rating > 0 && (
                            <div
                              className="mt-4 inline-flex items-center gap-2 px-3 py-2
                                            rounded-sm bg-amber-500/10 border border-amber-500/40"
                            >
                              <Star
                                size={14}
                                className="text-amber-400"
                                fill="currentColor"
                              />
                              <span
                                className="text-[10px] text-amber-400/80 uppercase
                                               tracking-wider font-mono"
                              >
                                TMDB
                              </span>
                              <span className="text-base font-bold text-amber-400 num-mono">
                                {film.tmdb_rating.toFixed(1)}
                              </span>
                              <span className="text-xs text-amber-400/60 num-mono">
                                /10
                              </span>
                            </div>
                          )}

                          {film.genres?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {film.genres.map((g) => (
                                <span
                                  key={g}
                                  className="text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider
                                             bg-black/60 text-blood-muted border border-blood-border
                                             hover:border-blood-accent hover:text-white transition-colors"
                                  style={{
                                    fontFamily: "Bebas Neue, sans-serif",
                                  }}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ============ МОИ НАСТРОЙКИ ============ */}
                    <div
                      className="px-4 md:px-8 py-5 border-t border-blood-border bg-black/30
                                    flex flex-col gap-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {STATUSES.map(({ value, label, icon: Icon, color }) => {
                          const isActive = film.status === value;
                          return (
                            <motion.button
                              key={value}
                              onClick={() => patchFilm({ status: value })}
                              disabled={updating}
                              className={`flex items-center gap-2 px-3 py-2 rounded-sm
                                          text-[11px] font-bold uppercase tracking-wider
                                          border transition-all duration-200
                                          disabled:opacity-50
                                          ${
                                            isActive
                                              ? `border-blood-accent bg-blood-accent/15 ${color} shadow-glow-sm`
                                              : "border-blood-border text-blood-muted hover:border-blood-accent/60 hover:text-white"
                                          }`}
                              style={{
                                fontFamily: "Bebas Neue, sans-serif",
                                letterSpacing: "0.06em",
                              }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Icon size={13} />
                              {label}
                            </motion.button>
                          );
                        })}

                        <motion.button
                          onClick={() =>
                            patchFilm({ is_favorite: !film.is_favorite })
                          }
                          disabled={updating}
                          className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-sm
                                      text-[11px] font-bold uppercase tracking-wider
                                      border transition-all duration-200 disabled:opacity-50
                                      ${
                                        film.is_favorite
                                          ? "bg-blood-accent/20 border-blood-accent text-blood-glow shadow-glow-sm"
                                          : "border-blood-border text-blood-muted hover:border-blood-accent/60 hover:text-blood-glow"
                                      }`}
                          style={{
                            fontFamily: "Bebas Neue, sans-serif",
                            letterSpacing: "0.06em",
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Heart
                            size={13}
                            fill={film.is_favorite ? "currentColor" : "none"}
                          />
                          {film.is_favorite ? "В ИЗБРАННОМ" : "В ИЗБРАННОЕ"}
                        </motion.button>
                      </div>

                      {film.status === "watched" && (
                        <div>
                          <p
                            className="text-[10px] text-blood-muted mb-3 uppercase tracking-[0.2em]
                                        font-mono"
                          >
                            МОЯ ОЦЕНКА · 1-10
                          </p>
                          <RatingInput
                            value={film.user_rating || 0}
                            onChange={(v) =>
                              patchFilm({ user_rating: v || null })
                            }
                            disabled={updating}
                          />
                        </div>
                      )}

                      {film.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Tag size={12} className="text-blood-accent" />
                          {film.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider
                                         bg-blood-accent/10 text-blood-glow border border-blood-accent/40"
                              style={{ fontFamily: "Bebas Neue, sans-serif" }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-1">
                        <span
                          className="text-[10px] text-blood-muted mt-2 shrink-0
                                         uppercase tracking-wider font-mono"
                        >
                          Источник:
                        </span>
                        {!editingSource ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <p className="text-xs text-blood-muted">
                              <span className="text-white font-mono uppercase">
                                {SOURCE_LABELS[film.source_type] ||
                                  film.source_type}
                              </span>
                              {film.source_name && (
                                <>
                                  {" · "}
                                  <span className="text-blood-glow">
                                    {film.source_name}
                                  </span>
                                </>
                              )}
                            </p>
                            <button
                              onClick={() => {
                                setSourceDraft({
                                  type: film.source_type || "streaming",
                                  name: film.source_name || "",
                                });
                                setEditingSource(true);
                              }}
                              className="text-[11px] text-blood-accent hover:text-blood-glow
                                         hover:underline shrink-0 transition-colors"
                            >
                              изменить
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              {SOURCES_LIST.map(
                                ({ value, short, icon: Icon }) => (
                                  <button
                                    key={value}
                                    onClick={() =>
                                      setSourceDraft((d) => ({
                                        ...d,
                                        type: value,
                                      }))
                                    }
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2
                                              rounded-sm text-[10px] font-bold uppercase tracking-wider
                                              border transition-all
                                              ${
                                                sourceDraft.type === value
                                                  ? "bg-blood-accent/15 border-blood-accent text-blood-glow shadow-glow-sm"
                                                  : "border-blood-border text-blood-muted hover:border-blood-accent/50"
                                              }`}
                                    style={{
                                      fontFamily: "Bebas Neue, sans-serif",
                                    }}
                                  >
                                    <Icon size={12} />
                                    {short}
                                  </button>
                                ),
                              )}
                            </div>
                            <input
                              type="text"
                              value={sourceDraft.name}
                              onChange={(e) =>
                                setSourceDraft((d) => ({
                                  ...d,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Netflix, /Movies/..., Blu-ray..."
                              className="w-full bg-black/40 border border-blood-border rounded-sm
                                         px-3 py-2 text-xs text-white placeholder-blood-muted/50
                                         focus:border-blood-accent focus:shadow-glow-sm transition"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingSource(false)}
                                className="flex-1 py-2 rounded-sm border border-blood-border
                                           text-[11px] font-bold uppercase tracking-wider
                                           text-blood-muted hover:text-white transition"
                                style={{ fontFamily: "Bebas Neue, sans-serif" }}
                              >
                                Отмена
                              </button>
                              <button
                                onClick={saveSource}
                                disabled={updating}
                                className="flex-1 py-2 rounded-sm bg-blood-accent text-white
                                           text-[11px] font-bold uppercase tracking-wider
                                           hover:bg-blood-glow shadow-glow-sm
                                           disabled:opacity-60 transition"
                                style={{ fontFamily: "Bebas Neue, sans-serif" }}
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {film.description && (
                      <div className="px-4 md:px-8 py-5 border-t border-blood-border">
                        <h3
                          className="text-xl text-blood-accent uppercase tracking-wider mb-3"
                          style={{
                            fontFamily: "Bebas Neue, sans-serif",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Описание
                        </h3>
                        <p className="text-sm text-blood-muted leading-relaxed">
                          {film.description}
                        </p>
                      </div>
                    )}

                    {film.directors?.length > 0 && (
                      <div className="px-4 md:px-8 py-5 border-t border-blood-border">
                        <h3
                          className="text-xl text-blood-accent uppercase tracking-wider mb-4"
                          style={{
                            fontFamily: "Bebas Neue, sans-serif",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {film.directors.length > 1 ? "Режиссёры" : "Режиссёр"}
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {film.directors.map((d) => (
                            <div key={d.id} className="flex items-center gap-3">
                              <Avatar
                                name={d.name}
                                url={d.profile_url}
                                size="sm"
                              />
                              <span className="text-sm text-white">
                                {d.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {film.actors?.length > 0 && (
                      <div className="px-4 md:px-8 py-5 border-t border-blood-border">
                        <h3
                          className="text-xl text-blood-accent uppercase tracking-wider mb-4"
                          style={{
                            fontFamily: "Bebas Neue, sans-serif",
                            letterSpacing: "0.05em",
                          }}
                        >
                          В РОЛЯХ
                        </h3>
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                          {film.actors.map((a) => (
                            <div
                              key={a.id}
                              className="flex flex-col items-center gap-2 shrink-0 w-20"
                            >
                              <Avatar
                                name={a.name}
                                url={a.profile_url}
                                size="md"
                              />
                              <div className="text-center">
                                <p className="text-[11px] text-white font-medium leading-tight line-clamp-2">
                                  {a.name}
                                </p>
                                {a.character && (
                                  <p className="text-[10px] text-blood-muted leading-tight line-clamp-2 mt-0.5">
                                    {a.character}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!providersLoading && providers?.providers?.length > 0 && (
                      <div className="px-4 md:px-8 py-5 border-t border-blood-border">
                        <div className="flex items-center justify-between mb-4">
                          <h3
                            className="text-xl text-blood-accent uppercase tracking-wider"
                            style={{
                              fontFamily: "Bebas Neue, sans-serif",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Мировые стриминги
                          </h3>
                          {providers.region && (
                            <span className="text-[10px] text-blood-muted font-mono">
                              {providers.region}
                            </span>
                          )}
                        </div>

                        {["subscription", "free", "ads", "rent", "buy"].map(
                          (type) => {
                            const list = providers.providers.filter(
                              (p) => p.type === type,
                            );
                            if (list.length === 0) return null;
                            return (
                              <div key={type} className="mb-4 last:mb-0">
                                <p
                                  className="text-[10px] text-blood-muted uppercase tracking-wider
                                            font-mono mb-2"
                                >
                                  {PROVIDER_TYPE_LABELS[type]}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {list.map((p) => (
                                    <motion.a
                                      key={`${p.id}-${type}`}
                                      href={providers.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-2 rounded-sm
                                               bg-black/40 border border-blood-border
                                               hover:border-blood-accent hover:bg-blood-accent/5
                                               group"
                                      whileHover={{ y: -2 }}
                                    >
                                      {p.logo && (
                                        <img
                                          src={p.logo}
                                          alt={p.name}
                                          className="w-6 h-6 rounded-sm shrink-0"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      )}
                                      <span
                                        className="text-xs text-white group-hover:text-blood-glow
                                                     transition-colors font-medium"
                                      >
                                        {p.name}
                                      </span>
                                      <ExternalLink
                                        size={10}
                                        className="text-blood-muted
                                                                     group-hover:text-blood-accent transition-colors shrink-0"
                                      />
                                    </motion.a>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    <WhereToWatch film={film} />
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditMetadataModal
        film={film}
        open={showEditMetadata}
        onClose={() => setShowEditMetadata(false)}
        onSaved={handleMetadataSaved}
      />
    </>
  );
}
