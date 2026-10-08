import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Check,
  AlertCircle,
  Plus,
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm
                     flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={onClose}
        >
          <motion.div
            className="w-full md:max-w-2xl bg-blood-card md:rounded-sm rounded-t-sm
                       border border-blood-accent/60 max-h-[95vh] md:max-h-[90vh]
                       flex flex-col overflow-hidden relative shadow-glow-lg"
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
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-sm bg-blood-accent/15 border border-blood-accent/60
                                flex items-center justify-center shrink-0"
                >
                  <Film size={20} className="text-blood-accent" />
                </div>
                <div className="min-w-0">
                  <h2 className="title-display text-2xl md:text-3xl text-white leading-none truncate">
                    РЕДАКТИРОВАНИЕ
                  </h2>
                  <p className="text-[10px] text-blood-muted mt-1 font-mono uppercase tracking-wider">
                    👑 Только для админа · ID #{film.id}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                disabled={saving}
                className="p-2 rounded-sm bg-black/60 text-blood-muted border border-blood-border
                           hover:text-blood-accent hover:border-blood-accent hover:shadow-glow-sm
                           transition-all disabled:opacity-50 shrink-0"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Закрыть"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Тело */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-start gap-2 p-3 rounded-sm
                               bg-blood-accent/10 border-l-2 border-blood-accent
                               text-blood-glow text-sm"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-start gap-2 p-3 rounded-sm
                               bg-emerald-500/10 border-l-2 border-emerald-500
                               text-emerald-300 text-sm"
                  >
                    <Check size={16} className="shrink-0 mt-0.5" />
                    <p>Сохранено!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                icon={<Film size={14} />}
                label="Название"
                value={form.title}
                onChange={(v) => update("title", v)}
                placeholder="Интерстеллар"
                required
              />

              <Field
                icon={<Film size={14} />}
                label="Оригинальное название"
                value={form.original_title}
                onChange={(v) => update("original_title", v)}
                placeholder="Interstellar"
              />

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

              <div>
                <label
                  className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                  font-mono mb-2 flex items-center gap-1.5"
                >
                  <FileText size={14} />
                  Описание
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Краткое описание фильма..."
                  rows={4}
                  className="w-full bg-black/40 border border-blood-border rounded-sm
                             px-4 py-3 text-white placeholder-blood-muted/50 text-sm
                             focus:border-blood-accent focus:shadow-glow-sm
                             transition resize-none"
                />
              </div>

              <div>
                <label
                  className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                  font-mono mb-2 flex items-center gap-1.5"
                >
                  <ImageIcon size={14} />
                  URL постера
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={form.poster_url}
                    onChange={(e) => update("poster_url", e.target.value)}
                    placeholder="https://image.tmdb.org/..."
                    className="flex-1 bg-black/40 border border-blood-border rounded-sm
                               px-4 py-2.5 text-white placeholder-blood-muted/50 text-sm
                               focus:border-blood-accent focus:shadow-glow-sm transition"
                  />
                  {form.poster_url && (
                    <div
                      className="w-12 h-16 rounded-sm overflow-hidden shrink-0
                                    border border-blood-border bg-black relative"
                    >
                      <img
                        src={form.poster_url}
                        alt="preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.opacity = "0.2";
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blood-accent" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                  font-mono mb-2 flex items-center gap-1.5"
                >
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
                    className="flex-1 bg-black/40 border border-blood-border rounded-sm
                               px-4 py-2.5 text-white placeholder-blood-muted/50 text-sm
                               focus:border-blood-accent focus:shadow-glow-sm
                               transition disabled:opacity-60"
                  />
                  <motion.button
                    onClick={addGenre}
                    disabled={!genreInput.trim() || saving}
                    className="px-4 rounded-sm border border-blood-border text-blood-muted
                               hover:border-blood-accent hover:text-blood-glow
                               disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {genres.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1.5 text-[10px]
                                   bg-blood-accent/15 text-blood-glow border border-blood-accent/40
                                   rounded-sm px-2.5 py-1 uppercase tracking-wider"
                        style={{ fontFamily: "Bebas Neue, sans-serif" }}
                      >
                        {g}
                        <button
                          onClick={() => removeGenre(g)}
                          disabled={saving}
                          className="hover:text-white transition disabled:opacity-50"
                          type="button"
                          aria-label={`Убрать ${g}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Футер */}
            <div
              className="p-4 md:p-5 border-t border-blood-border shrink-0
                            pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-5"
            >
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="btn-ghost flex-1 py-3 disabled:opacity-50 text-sm"
                >
                  Отмена
                </button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving || success}
                  className="btn-blood flex-1 py-3 flex items-center justify-center gap-2
                             disabled:opacity-60 disabled:cursor-not-allowed relative
                             overflow-hidden group"
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
                    ) : success ? (
                      <>
                        <Check size={18} />
                        СОХРАНЕНО
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        СОХРАНИТЬ
                      </>
                    )}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
      <label
        className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                        font-mono mb-2 flex items-center gap-1.5"
      >
        {icon}
        {label}
        {required && <span className="text-blood-accent">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-black/40 border border-blood-border rounded-sm
                   px-4 py-2.5 text-white placeholder-blood-muted/50 text-sm
                   focus:border-blood-accent focus:shadow-glow-sm transition"
      />
    </div>
  );
}
