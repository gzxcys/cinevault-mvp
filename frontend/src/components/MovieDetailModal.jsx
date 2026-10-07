import { useState, useEffect } from "react";
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
  Tv,
  HardDrive,
  Disc,
} from "lucide-react";
import {
  getFilm,
  getFilmProviders,
  updateFilm,
  deleteFilm,
} from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { SOURCES_LIST, getSource } from "../utils/sources.js";
import RatingInput from "./RatingInput.jsx";
import WhereToWatch from "./WhereToWatch.jsx";

const STATUSES = [
  {
    value: "watched",
    label: "Просмотрено",
    icon: Check,
    color: "text-emerald-400",
  },
  { value: "watching", label: "Смотрю", icon: Play, color: "text-electric" },
  {
    value: "planned",
    label: "В планах",
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
    "from-blue-600 to-purple-700",
    "from-electric to-blue-600",
    "from-purple-600 to-pink-600",
    "from-emerald-500 to-teal-700",
    "from-orange-500 to-red-600",
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
        className={`${sizes[size]} rounded-full object-cover border-2 border-dark-border`}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br ${grad}
                    flex items-center justify-center font-bold text-white
                    border-2 border-dark-border shrink-0`}
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

  useEffect(() => {
    if (!open || !filmId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFilm(null);
    setConfirmDelete(false);
    setEditingSource(false);

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-3xl bg-dark-card md:rounded-2xl rounded-t-2xl
                   border border-dark-border max-h-[95vh] md:max-h-[90vh]
                   flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Верхние кнопки */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {film && (
            <>
              {isAdmin && (
                <button
                  onClick={() =>
                    alert(
                      "Редактирование метаданных — в разработке. Функция появится в следующем обновлении.",
                    )
                  }
                  className="p-2 rounded-full bg-black/60 backdrop-blur text-white
                             hover:bg-electric/30 transition active:scale-90"
                  title="Редактировать метаданные (только для админа)"
                >
                  <Pencil size={18} />
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-full bg-black/60 backdrop-blur text-white
                           hover:bg-red-500/40 transition active:scale-90"
                title="Удалить из коллекции"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 backdrop-blur text-white
                       hover:bg-black/80 transition active:scale-90"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Подтверждение удаления */}
        {confirmDelete && (
          <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 max-w-sm w-full border border-red-500/40">
              <h3 className="text-lg font-bold mb-2">Удалить из коллекции?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Фильм{" "}
                <span className="text-white font-medium">{film?.title}</span>{" "}
                пропадёт из твоей библиотеки. Он останется в глобальном
                каталоге.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="btn-ghost flex-1 py-2.5 disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold
                             flex items-center justify-center gap-2
                             hover:bg-red-600 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={32} className="text-electric animate-spin" />
              <p className="text-slate-400 text-sm">Загружаю информацию...</p>
            </div>
          )}

          {error && (
            <div className="p-6 text-center">
              <p className="text-red-400">Ошибка: {error}</p>
            </div>
          )}

          {film && (
            <>
              {/* Обложка + основная инфа */}
              <div className="relative">
                {film.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl"
                    style={{ backgroundImage: `url(${film.poster_url})` }}
                  />
                )}
                <div className="relative p-4 md:p-6 flex gap-4 md:gap-6">
                  <div
                    className="w-28 md:w-40 shrink-0 rounded-xl overflow-hidden
                                  bg-gradient-to-br from-electric/20 to-purple-600/20
                                  border border-dark-border shadow-neon"
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
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                      {film.title}
                    </h2>
                    {film.original_title &&
                      film.original_title !== film.title && (
                        <p className="text-sm text-slate-400 mt-0.5">
                          {film.original_title}
                        </p>
                      )}

                    {/* Год + длительность + тип */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-300">
                      {film.year && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} /> {film.year}
                        </span>
                      )}
                      {film.runtime > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {film.runtime} мин
                        </span>
                      )}
                      {film.type === "series" && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full
                                         bg-electric/10 text-electric border border-electric/40"
                        >
                          Сериал
                        </span>
                      )}
                    </div>

                    {/* Рейтинг TMDB — отдельным блоком с явной подписью */}
                    {film.tmdb_rating > 0 && (
                      <div
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5
                                      rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <Star
                          size={14}
                          className="text-amber-400"
                          fill="currentColor"
                        />
                        <span className="text-xs text-slate-400">
                          Рейтинг TMDB:
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {film.tmdb_rating.toFixed(1)}/10
                        </span>
                      </div>
                    )}

                    {film.genres?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {film.genres.map((g) => (
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
                  </div>
                </div>
              </div>

              {/* Мои настройки */}
              <div className="px-4 md:px-6 py-4 border-t border-dark-border flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {STATUSES.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => patchFilm({ status: value })}
                      disabled={updating}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                  border transition-all active:scale-95 disabled:opacity-50
                                  ${
                                    film.status === value
                                      ? `bg-white/5 border-white/30 ${color}`
                                      : "border-dark-border text-slate-400 hover:border-white/20"
                                  }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      patchFilm({ is_favorite: !film.is_favorite })
                    }
                    disabled={updating}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                border transition-all active:scale-95 disabled:opacity-50
                                ${
                                  film.is_favorite
                                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                                    : "border-dark-border text-slate-400 hover:border-red-500/40 hover:text-red-400"
                                }`}
                  >
                    <Heart
                      size={14}
                      fill={film.is_favorite ? "currentColor" : "none"}
                    />
                    {film.is_favorite ? "В избранном" : "В избранное"}
                  </button>
                </div>

                {/* Моя оценка 1-10 */}
                {film.status === "watched" && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">
                      <span className="text-slate-300 font-medium">
                        Моя оценка
                      </span>
                      <span className="text-slate-500 ml-1.5">(1-10)</span>
                    </p>
                    <RatingInput
                      value={film.user_rating || 0}
                      onChange={(v) => patchFilm({ user_rating: v || null })}
                      disabled={updating}
                    />
                  </div>
                )}

                {film.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Tag size={12} className="text-slate-500" />
                    {film.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded-full
                                   bg-electric/10 text-electric border border-electric/30"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Источник */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-xs text-slate-500 mt-1 shrink-0">
                    Источник:
                  </span>
                  {!editingSource ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        <span className="text-slate-400">
                          {SOURCE_LABELS[film.source_type] || film.source_type}
                        </span>
                        {film.source_name && (
                          <>
                            {" · "}
                            <span className="text-electric">
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
                        className="text-[11px] text-electric hover:underline shrink-0"
                      >
                        изменить
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        {SOURCES_LIST.map(({ value, short, icon: Icon }) => (
                          <button
                            key={value}
                            onClick={() =>
                              setSourceDraft((d) => ({ ...d, type: value }))
                            }
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2
                                        rounded-lg text-[11px] border transition-all
                                        ${
                                          sourceDraft.type === value
                                            ? "bg-electric/10 border-electric text-electric"
                                            : "border-dark-border text-slate-400 hover:border-electric/40"
                                        }`}
                          >
                            <Icon size={12} />
                            {short}
                          </button>
                        ))}
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
                        className="w-full bg-dark-bg border border-dark-border rounded-lg
                                   px-3 py-2 text-xs text-white placeholder-slate-500
                                   focus:border-electric transition"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSource(false)}
                          className="flex-1 py-1.5 rounded-lg border border-dark-border text-xs
                                     text-slate-400 hover:text-white transition"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={saveSource}
                          disabled={updating}
                          className="flex-1 py-1.5 rounded-lg bg-electric text-dark-bg text-xs
                                     font-semibold disabled:opacity-60"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Описание */}
              {film.description && (
                <div className="px-4 md:px-6 py-4 border-t border-dark-border">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">
                    Описание
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {film.description}
                  </p>
                </div>
              )}

              {/* Режиссёр */}
              {film.directors?.length > 0 && (
                <div className="px-4 md:px-6 py-4 border-t border-dark-border">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    {film.directors.length > 1 ? "Режиссёры" : "Режиссёр"}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {film.directors.map((d) => (
                      <div key={d.id} className="flex items-center gap-2">
                        <Avatar name={d.name} url={d.profile_url} size="sm" />
                        <span className="text-sm text-white">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Актёры */}
              {film.actors?.length > 0 && (
                <div className="px-4 md:px-6 py-4 border-t border-dark-border">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    В ролях
                  </h3>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {film.actors.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col items-center gap-2 shrink-0 w-20"
                      >
                        <Avatar name={a.name} url={a.profile_url} size="md" />
                        <div className="text-center">
                          <p className="text-xs text-white font-medium leading-tight line-clamp-2">
                            {a.name}
                          </p>
                          {a.character && (
                            <p className="text-[10px] text-slate-500 leading-tight line-clamp-2 mt-0.5">
                              {a.character}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Мировые провайдеры */}
              {!providersLoading && providers?.providers?.length > 0 && (
                <div className="px-4 md:px-6 py-4 border-t border-dark-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">
                      Мировые стриминги
                    </h3>
                    {providers.region && (
                      <span className="text-[10px] text-slate-500 uppercase">
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
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                            {PROVIDER_TYPE_LABELS[type]}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {list.map((p) => (
                              <a
                                key={`${p.id}-${type}`}
                                href={providers.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2.5 py-1.5
                                         bg-white/5 rounded-lg border border-white/10
                                         hover:border-electric/60 hover:bg-electric/5
                                         active:scale-[0.97] transition-all group"
                              >
                                {p.logo && (
                                  <img
                                    src={p.logo}
                                    alt={p.name}
                                    className="w-6 h-6 rounded shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="text-xs text-white font-medium group-hover:text-electric transition">
                                  {p.name}
                                </span>
                                <ExternalLink
                                  size={10}
                                  className="text-slate-500 group-hover:text-electric transition shrink-0"
                                />
                              </a>
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
      </div>
    </div>
  );
}
