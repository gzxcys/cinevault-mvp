import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Pencil,
  User,
  Briefcase,
  MapPin,
  FileText,
  Globe,
  Send,
  Instagram,
  Mail,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { API_URL } from "../config.js";

function getToken() {
  return localStorage.getItem("cinevault_token");
}

export default function ProfilePage({ onBack, initialMode = "view" }) {
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState(initialMode);

  return (
    <AnimatePresence mode="wait">
      {mode === "view" ? (
        <motion.div
          key="view"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileView
            user={user}
            onBack={onBack}
            onEdit={() => setMode("edit")}
          />
        </motion.div>
      ) : (
        <motion.div
          key="edit"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileEdit
            user={user}
            setUser={setUser}
            onBack={onBack}
            onCancel={() => setMode("view")}
            onSaved={() => setMode("view")}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// VIEW
// ============================================================
function ProfileView({ user, onBack, onEdit }) {
  const displayName = user.full_name || user.name || user.email;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const contacts = [
    { icon: Globe, label: "Сайт", value: user.website, href: user.website },
    {
      icon: Send,
      label: "Telegram",
      value: user.telegram,
      href: user.telegram?.startsWith("@")
        ? `https://t.me/${user.telegram.slice(1)}`
        : null,
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: user.instagram,
      href: user.instagram?.startsWith("@")
        ? `https://instagram.com/${user.instagram.slice(1)}`
        : null,
    },
  ].filter((c) => c.value);

  const isEmpty =
    !user.full_name &&
    !user.workplace &&
    !user.bio &&
    !user.city &&
    contacts.length === 0;

  return (
    <div className="min-h-screen bg-blood-bg text-white">
      {/* Верхний хедер */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md border-b border-blood-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={onBack}
            className="p-2 rounded-sm text-blood-muted border border-blood-border
                       hover:text-white hover:border-blood-accent hover:shadow-glow-sm
                       transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <h1 className="title-display text-2xl md:text-3xl flex-1 leading-none">
            ПРОФИЛЬ
          </h1>
          <motion.button
            onClick={onEdit}
            className="btn-blood flex items-center gap-2 py-2 px-3 md:px-4 text-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">ИЗМЕНИТЬ</span>
          </motion.button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pt-24 pb-24 px-4">
        {/* Карточка юзера */}
        <motion.div
          className="bg-blood-card border border-blood-border rounded-sm p-6 mb-4
                     relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Красная верхняя полоса */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]
                          bg-gradient-to-r from-transparent via-blood-accent to-transparent"
          />

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div
              className="w-28 h-28 rounded-sm overflow-hidden
                            bg-gradient-to-br from-blood-accent to-blood-dim
                            border-2 border-blood-border shadow-glow-lg
                            flex items-center justify-center shrink-0"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="title-display text-4xl text-white">
                  {initials}
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="title-display text-3xl md:text-4xl text-white mb-1 leading-none">
                {displayName}
              </h2>
              {user.full_name && user.full_name !== user.name && (
                <p className="text-sm text-blood-muted mb-2 font-mono">
                  {user.name}
                </p>
              )}
              <p
                className="text-sm text-blood-muted flex items-center justify-center sm:justify-start
                            gap-1.5 mb-2 font-mono"
              >
                <Mail size={14} className="text-blood-accent" />
                {user.email}
              </p>
              {(user.workplace || user.city) && (
                <p
                  className="text-sm text-blood-muted flex items-center justify-center sm:justify-start
                              gap-3 flex-wrap uppercase tracking-wider text-[11px] font-mono"
                >
                  {user.workplace && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-blood-accent" />
                      {user.workplace}
                    </span>
                  )}
                  {user.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-blood-accent" />
                      {user.city}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {user.bio && (
            <div className="mt-5 pt-5 border-t border-blood-border">
              <p className="text-[10px] text-blood-muted uppercase tracking-[0.2em] font-mono mb-2">
                О себе
              </p>
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                {user.bio}
              </p>
            </div>
          )}
        </motion.div>

        {/* Контакты */}
        {contacts.length > 0 && (
          <motion.div
            className="bg-blood-card border border-blood-border rounded-sm p-5 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h3
              className="text-xl text-blood-accent uppercase tracking-wider mb-4"
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Контакты
            </h3>
            <div className="space-y-2.5">
              {contacts.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon size={15} className="text-blood-accent shrink-0" />
                  <span
                    className="text-blood-muted w-20 shrink-0 text-[10px]
                                   uppercase tracking-wider font-mono"
                  >
                    {label}
                  </span>
                  {href ? (
                    <motion.a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blood-glow hover:text-white hover:underline truncate transition-colors"
                      whileHover={{ x: 2 }}
                    >
                      {value}
                    </motion.a>
                  ) : (
                    <span className="text-white truncate">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Пустой профиль */}
        {isEmpty && (
          <motion.div
            className="bg-blood-card border border-dashed border-blood-accent/40 rounded-sm p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <p className="text-blood-muted mb-4 uppercase tracking-wider font-mono text-sm">
              Профиль пока пустой
            </p>
            <motion.button
              onClick={onEdit}
              className="btn-blood inline-flex items-center gap-2 px-5 py-2.5 text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Pencil size={16} />
              Заполнить профиль
            </motion.button>
          </motion.div>
        )}

        {/* Дата регистрации */}
        <motion.p
          className="text-center text-[10px] text-blood-muted uppercase tracking-[0.3em] mt-8 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          В CineVault с{" "}
          {new Date(user.created_at).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </motion.p>
      </main>
    </div>
  );
}

// ============================================================
// EDIT
// ============================================================
function ProfileEdit({ user, setUser, onBack, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    full_name: user?.full_name || "",
    workplace: user?.workplace || "",
    bio: user?.bio || "",
    city: user?.city || "",
    website: user?.website || "",
    telegram: user?.telegram || "",
    instagram: user?.instagram || "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);

  const initials = (form.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");

      setUser(data.user);
      setSuccess("Профиль сохранён");
      setTimeout(() => onSaved(), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const MAX = 1.5 * 1024 * 1024;
    if (file.size > MAX) {
      setError(
        `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум 1.5 МБ.`,
      );
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Допустимы только JPEG, PNG или WebP");
      return;
    }

    setUploading(true);

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${API_URL}/auth/avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить аватар");

      setUser(data.user);
      setSuccess("Аватар обновлён");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarDelete() {
    if (!confirm("Удалить аватар?")) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setUser(data.user);
      setSuccess("Аватар удалён");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-blood-bg text-white">
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md border-b border-blood-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={onCancel}
            className="p-2 rounded-sm text-blood-muted border border-blood-border
                       hover:text-white hover:border-blood-accent hover:shadow-glow-sm
                       transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <h1 className="title-display text-2xl md:text-3xl flex-1 leading-none">
            РЕДАКТИРОВАНИЕ ПРОФИЛЯ
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pt-24 pb-24 px-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="mb-4 flex items-start gap-2 p-3 rounded-sm
                         bg-blood-accent/10 border-l-2 border-blood-accent text-blood-glow text-sm"
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
              className="mb-4 flex items-start gap-2 p-3 rounded-sm
                         bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-300 text-sm"
            >
              <Check size={16} className="shrink-0 mt-0.5" />
              <p>{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Аватар */}
        <motion.div
          className="bg-blood-card border border-blood-border rounded-sm p-6 mb-4
                     relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px]
                          bg-gradient-to-r from-transparent via-blood-accent to-transparent"
          />

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0">
              <div
                className="w-28 h-28 rounded-sm overflow-hidden
                              bg-gradient-to-br from-blood-accent to-blood-dim
                              border-2 border-blood-border shadow-glow-lg
                              flex items-center justify-center"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={form.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="title-display text-4xl text-white">
                    {initials}
                  </span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-sm bg-black/70 flex items-center justify-center">
                  <Loader2
                    size={28}
                    className="text-blood-accent animate-spin"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="title-display text-2xl text-white mb-3">
                {form.name || "Без имени"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-blood flex items-center gap-2 text-sm px-4 py-2.5
                             disabled:opacity-60"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Camera size={16} />
                  {user?.avatar_url ? "ЗАМЕНИТЬ" : "ЗАГРУЗИТЬ"}
                </motion.button>
                {user?.avatar_url && (
                  <button
                    onClick={handleAvatarDelete}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-sm
                               border border-blood-border text-blood-glow text-[11px]
                               font-bold uppercase tracking-wider
                               hover:border-blood-accent hover:shadow-glow-sm
                               disabled:opacity-60 transition"
                    style={{ fontFamily: "Bebas Neue, sans-serif" }}
                  >
                    <Trash2 size={14} />
                    УДАЛИТЬ
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-blood-muted mt-3 uppercase tracking-wider font-mono">
                JPEG, PNG, WebP · до 1.5 МБ
              </p>
            </div>
          </div>
        </motion.div>

        {/* Форма */}
        <form onSubmit={handleSave} className="space-y-4">
          <motion.div
            className="bg-blood-card border border-blood-border rounded-sm p-5 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <h2
              className="text-xl text-blood-accent uppercase tracking-wider mb-2"
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Личные данные
            </h2>
            <Field
              icon={<User size={14} />}
              label="Имя"
              value={form.name}
              onChange={(v) => update("name", v)}
              placeholder="Как тебя зовут?"
              required
            />
            <Field
              icon={<User size={14} />}
              label="ФИО"
              value={form.full_name}
              onChange={(v) => update("full_name", v)}
              placeholder="Иванов Иван Иванович"
            />
          </motion.div>

          <motion.div
            className="bg-blood-card border border-blood-border rounded-sm p-5 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h2
              className="text-xl text-blood-accent uppercase tracking-wider mb-2"
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Работа и место
            </h2>
            <Field
              icon={<Briefcase size={14} />}
              label="Место работы"
              value={form.workplace}
              onChange={(v) => update("workplace", v)}
              placeholder="Яндекс, Сбер, Фриланс..."
            />
            <Field
              icon={<MapPin size={14} />}
              label="Город"
              value={form.city}
              onChange={(v) => update("city", v)}
              placeholder="Москва"
            />
          </motion.div>

          <motion.div
            className="bg-blood-card border border-blood-border rounded-sm p-5 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h2
              className="text-xl text-blood-accent uppercase tracking-wider mb-2"
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              О себе и контакты
            </h2>
            <div>
              <label
                className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                font-mono mb-2 flex items-center gap-1.5"
              >
                <FileText size={14} />О себе
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Люблю Нолана, коплю на Blu-ray Дюны..."
                rows={3}
                maxLength={500}
                className="w-full bg-black/40 border border-blood-border rounded-sm
                           px-4 py-3 text-white placeholder-blood-muted/50 text-sm
                           focus:border-blood-accent focus:shadow-glow-sm
                           transition resize-none"
              />
              <p className="text-[10px] text-blood-muted mt-1 text-right font-mono">
                {form.bio.length}/500
              </p>
            </div>
            <Field
              icon={<Globe size={14} />}
              label="Сайт"
              value={form.website}
              onChange={(v) => update("website", v)}
              placeholder="https://example.com"
              type="url"
            />
            <Field
              icon={<Send size={14} />}
              label="Telegram"
              value={form.telegram}
              onChange={(v) => update("telegram", v)}
              placeholder="@username"
            />
            <Field
              icon={<Instagram size={14} />}
              label="Instagram"
              value={form.instagram}
              onChange={(v) => update("instagram", v)}
              placeholder="@username"
            />
          </motion.div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost flex-1 py-3.5 text-sm"
            >
              ОТМЕНА
            </button>
            <motion.button
              type="submit"
              disabled={saving}
              className="btn-blood flex-1 py-3.5 flex items-center justify-center gap-2
                         disabled:opacity-60 relative overflow-hidden group"
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
                    СОХРАНИТЬ
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </form>
      </main>
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
