import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Film,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  Tag,
} from "lucide-react";
import { updateFilm } from "../services/api.js";

export default function EditMetadataModal({ film, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "",
    original_title: "",
    year: "",
    director: "",
    description: "",
    poster_url: "",
  });
  const [genres, setGenres] = useState([]);
  const [genreInput, setGenreInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // При открытии — заполнить из film
  useEffect(() => {
    if (open && film) {
      setForm({
        title: film.title || "",
        original_title: film.original_title || "",
        year: film.year ? String(film.year) : "",
        director: film.director || "",
        description: film.description || "",
        poster_url: film.poster_url || "",
      });
      setGenres(film.genres || []);
      setGenreInput("");
      setError(null);
      setSuccess(false);
    }
  }, [open, film]);

  // Esc для закрытия
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  if (!open || !film) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  function addGenre() {
    const g = genreInput.trim();
    if (!g || genres.includes(g)) return;
    setGenres([...genres, g]);
    setGenreInput("");
  }

  function removeGenre(g) {
    setGenres(genres.filter((x) => x !== g));
  }

  async function handleSave() {
    // Валидация
    if (!form.title.trim()) {
      setError("Название не может быть пустым");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        title: form.title.trim(),
        original_title: form.original_title.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        director: form.director.trim() || null,
        description: form.description.trim() || null,
        poster_url: form.poster_url.trim() || null,
        genres,
      };

      const updated = await updateFilm(film.id, payload);
      setSuccess(true);
      onSaved?.(updated);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl bg-dark-card md:rounded-2xl rounded-t-2xl
                   border border-electric/40 max-h-[95vh] md:max-h-[90vh]
                   flex flex-col overflow-hidden animate-slide-up shadow-neon"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-dark-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg bg-electric/15 border border-electric/40
                            flex items-center justify-center shrink-0"
            >
              <Film size={20} className="text-electric" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold truncate">
                Редактирование метаданных
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                👑 Только для админа · ID #{film.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5
                       transition disabled:opacity-50 shrink-0"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg
                            bg-red-500/10 border border-red-500/40 text-red-300 text-sm"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg
                            bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm"
            >
              <Check size={16} className="shrink-0 mt-0.5" />
              <p>Сохранено!</p>
            </div>
          )}

          {/* Название */}
          <Field
            icon={<Film size={14} />}
            label="Название"
            value={form.title}
            onChange={(v) => update("title", v)}
            placeholder="Интерстеллар"
            required
          />

          {/* Оригинальное название */}
          <Field
            icon={<Film size={14} />}
            label="Оригинальное название"
            value={form.original_title}
            onChange={(v) => update("original_title", v)}
            placeholder="Interstellar"
          />

          {/* Год + Режиссёр — 2 колонки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              icon={<Calendar size={14} />}
              label="Год"
              type="number"
              value={form.year}
              onChange={(v) => update("year", v)}
              placeholder="2014"
            />
            <Field
              icon={<User size={14} />}
              label="Режиссёр"
              value={form.director}
              onChange={(v) => update("director", v)}
              placeholder="Кристофер Нолан"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} />
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Краткое описание фильма..."
              rows={4}
              className="w-full bg-dark-bg border border-dark-border rounded-xl
                         px-4 py-3 text-white placeholder-slate-500 text-sm
                         focus:border-electric transition resize-none"
            />
          </div>

          {/* Постер */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={14} />
              URL постера
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={form.poster_url}
                onChange={(e) => update("poster_url", e.target.value)}
                placeholder="https://image.tmdb.org/..."
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl
                           px-4 py-2.5 text-white placeholder-slate-500 text-sm
                           focus:border-electric transition"
              />
              {form.poster_url && (
                <div
                  className="w-12 h-16 rounded-md overflow-hidden shrink-0
                                border border-dark-border bg-slate-800"
                >
                  <img
                    src={form.poster_url}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.opacity = "0.2";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Жанры — чипсы */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Tag size={14} />
              Жанры
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGenre();
                  }
                }}
                disabled={saving}
                placeholder="Фантастика, Драма..."
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl
                           px-4 py-2.5 text-white placeholder-slate-500 text-sm
                           focus:border-electric transition disabled:opacity-60"
              />
              <button
                onClick={addGenre}
                disabled={!genreInput.trim() || saving}
                className="btn-ghost px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
              >
                <Plus size={16} />
              </button>
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1.5 text-xs
                               bg-electric/10 text-electric border border-electric/40
                               rounded-full px-3 py-1"
                  >
                    {g}
                    <button
                      onClick={() => removeGenre(g)}
                      disabled={saving}
                      className="hover:text-white transition disabled:opacity-50"
                      type="button"
                      aria-label={`Убрать ${g}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Футер */}
        <div
          className="p-4 md:p-5 border-t border-dark-border shrink-0
                        pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-5"
        >
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="btn-ghost flex-1 py-3 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || success}
              className="btn-electric flex-1 py-3 flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Сохраняю...
                </>
              ) : success ? (
                <>
                  <Check size={18} />
                  Сохранено
                </>
              ) : (
                <>
                  <Save size={18} />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-dark-bg border border-dark-border rounded-xl
                   px-4 py-2.5 text-white placeholder-slate-500 text-sm
                   focus:border-electric transition"
      />
    </div>
  );
}
