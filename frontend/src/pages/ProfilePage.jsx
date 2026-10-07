import { useState, useRef } from "react";
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

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("cinevault_token");
}

export default function ProfilePage({ onBack, initialMode = "view" }) {
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'view' | 'edit'

  // ============================================================
  // VIEW-РЕЖИМ — красивая карточка профиля
  // ============================================================
  if (mode === "view") {
    return (
      <ProfileView user={user} onBack={onBack} onEdit={() => setMode("edit")} />
    );
  }

  // ============================================================
  // EDIT-РЕЖИМ — форма редактирования
  // ============================================================
  return (
    <ProfileEdit
      user={user}
      setUser={setUser}
      onBack={onBack}
      onCancel={() => setMode("view")}
      onSaved={() => setMode("view")}
    />
  );
}

// ============================================================
// VIEW — просмотр профиля
// ============================================================
function ProfileView({ user, onBack, onEdit }) {
  const displayName = user.full_name || user.name || user.email;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Собираем заполненные контакты
  const contacts = [
    {
      icon: Globe,
      label: "Сайт",
      value: user.website,
      isLink: true,
      href: user.website,
    },
    {
      icon: Send,
      label: "Telegram",
      value: user.telegram,
      isLink: true,
      href: user.telegram?.startsWith("@")
        ? `https://t.me/${user.telegram.slice(1)}`
        : null,
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: user.instagram,
      isLink: true,
      href: user.instagram?.startsWith("@")
        ? `https://instagram.com/${user.instagram.slice(1)}`
        : null,
    },
  ].filter((c) => c.value);

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Шапка */}
      <header className="sticky top-0 z-20 bg-dark-bg/90 backdrop-blur border-b border-dark-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold flex-1">Профиль</h1>
          <button
            onClick={onEdit}
            className="btn-electric flex items-center gap-2 text-sm px-3 py-2"
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">Редактировать</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
        {/* Карточка юзера */}
        <div className="card p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div
              className="w-28 h-28 rounded-full overflow-hidden
                            bg-gradient-to-br from-electric to-purple-600
                            border-4 border-dark-card shadow-neon-lg
                            flex items-center justify-center shrink-0"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-dark-bg">
                  {initials}
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold mb-1">{displayName}</h2>
              {user.full_name && user.full_name !== user.name && (
                <p className="text-sm text-slate-400 mb-2">{user.name}</p>
              )}
              <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mb-2">
                <Mail size={14} />
                {user.email}
              </p>
              {(user.workplace || user.city) && (
                <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  {user.workplace && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} />
                      {user.workplace}
                    </span>
                  )}
                  {user.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {user.city}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {user.bio && (
            <div className="mt-5 pt-5 border-t border-dark-border">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {user.bio}
              </p>
            </div>
          )}
        </div>

        {/* Контакты */}
        {contacts.length > 0 && (
          <div className="card p-5 mb-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-3">
              Контакты
            </h3>
            <div className="space-y-2">
              {contacts.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon size={16} className="text-electric shrink-0" />
                  <span className="text-slate-500 w-20 shrink-0">{label}:</span>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-electric hover:underline truncate"
                    >
                      {value}
                    </a>
                  ) : (
                    <span className="text-slate-300 truncate">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если профиль пустой — приглашение заполнить */}
        {!user.full_name &&
          !user.workplace &&
          !user.bio &&
          !user.city &&
          contacts.length === 0 && (
            <div className="card p-6 border-dashed border-electric/30 text-center">
              <p className="text-slate-400 mb-3">Профиль пока пустой</p>
              <button
                onClick={onEdit}
                className="btn-electric text-sm px-4 py-2 inline-flex items-center gap-2"
              >
                <Pencil size={16} />
                Заполнить профиль
              </button>
            </div>
          )}

        {/* Метаинформация */}
        <div className="mt-6 text-center text-xs text-slate-600">
          В CineVault с{" "}
          {new Date(user.created_at).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// EDIT — форма редактирования
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
      const res = await fetch(`${API_BASE}/auth/me`, {
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

      const res = await fetch(`${API_BASE}/auth/avatar`, {
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
      const res = await fetch(`${API_BASE}/auth/avatar`, {
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
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Шапка */}
      <header className="sticky top-0 z-20 bg-dark-bg/90 backdrop-blur border-b border-dark-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold flex-1">Редактирование профиля</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
        {error && (
          <div
            className="mb-4 flex items-start gap-2 p-3 rounded-lg
                          bg-red-500/10 border border-red-500/40 text-red-300 text-sm"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div
            className="mb-4 flex items-start gap-2 p-3 rounded-lg
                          bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm"
          >
            <Check size={16} className="shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        {/* Аватар */}
        <div className="card p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0">
              <div
                className="w-28 h-28 rounded-full overflow-hidden
                              bg-gradient-to-br from-electric to-purple-600
                              border-4 border-dark-card shadow-neon-lg
                              flex items-center justify-center"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={form.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-dark-bg">
                    {initials}
                  </span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <Loader2 size={28} className="text-electric animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-lg mb-3">
                {form.name || "Без имени"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-electric flex items-center gap-2 text-sm px-3 py-2
                             disabled:opacity-60"
                >
                  <Camera size={16} />
                  {user?.avatar_url ? "Заменить фото" : "Загрузить фото"}
                </button>
                {user?.avatar_url && (
                  <button
                    onClick={handleAvatarDelete}
                    disabled={uploading}
                    className="btn-ghost flex items-center gap-2 text-sm px-3 py-2
                               border-red-500/30 text-red-400 hover:border-red-500/60
                               disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Удалить
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
              <p className="text-[11px] text-slate-500 mt-2">
                JPEG, PNG или WebP, до 1.5 МБ
              </p>
            </div>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">
              Личные данные
            </h2>
            <ProfileField
              icon={<User size={16} />}
              label="Имя (короткое)"
              value={form.name}
              onChange={(v) => update("name", v)}
              placeholder="Как тебя зовут?"
              required
            />
            <ProfileField
              icon={<User size={16} />}
              label="ФИО"
              value={form.full_name}
              onChange={(v) => update("full_name", v)}
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">
              Работа и место
            </h2>
            <ProfileField
              icon={<Briefcase size={16} />}
              label="Место работы"
              value={form.workplace}
              onChange={(v) => update("workplace", v)}
              placeholder="Яндекс, Сбер, Фриланс..."
            />
            <ProfileField
              icon={<MapPin size={16} />}
              label="Город"
              value={form.city}
              onChange={(v) => update("city", v)}
              placeholder="Москва"
            />
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">
              О себе и контакты
            </h2>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <FileText size={14} />О себе
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Люблю Нолана, коплю на Blu-ray Дюны..."
                rows={3}
                maxLength={500}
                className="w-full bg-dark-bg border border-dark-border rounded-xl
                           px-4 py-3 text-white placeholder-slate-500 text-sm
                           focus:border-electric transition resize-none"
              />
              <p className="text-[10px] text-slate-500 mt-1 text-right">
                {form.bio.length}/500
              </p>
            </div>
            <ProfileField
              icon={<Globe size={16} />}
              label="Сайт"
              value={form.website}
              onChange={(v) => update("website", v)}
              placeholder="https://example.com"
              type="url"
            />
            <ProfileField
              icon={<Send size={16} />}
              label="Telegram"
              value={form.telegram}
              onChange={(v) => update("telegram", v)}
              placeholder="@username"
            />
            <ProfileField
              icon={<Instagram size={16} />}
              label="Instagram"
              value={form.instagram}
              onChange={(v) => update("instagram", v)}
              placeholder="@username"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost flex-1 py-3"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-electric flex-1 py-3 flex items-center justify-center gap-2
                         disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Сохраняю...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function ProfileField({
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
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-dark-bg border border-dark-border rounded-xl
                   px-4 py-3 text-white placeholder-slate-500 text-sm
                   focus:border-electric transition"
      />
    </div>
  );
}
