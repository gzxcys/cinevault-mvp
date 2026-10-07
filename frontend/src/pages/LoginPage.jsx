import { useState } from "react";
import {
  Film,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const { login, register, emailNotVerified, resendVerification } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resending, setResending] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
        // После успешного логина AuthContext обновит user — App перерисуется
      } else {
        const data = await register(email, password, name);
        setSuccess(
          data.emailSent
            ? "Аккаунт создан! Проверь почту и подтверди email."
            : "Аккаунт создан, но письмо не ушло. Проверь настройки SMTP или попробуй «Переотправить».",
        );
        // Не логиним автоматически — сначала подтверждение email
      }
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setError("Email не подтверждён. Проверь почту.");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!emailNotVerified) return;
    setResending(true);
    setError(null);
    try {
      await resendVerification(emailNotVerified);
      setSuccess("Письмо отправлено повторно. Проверь почту.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      {/* Декоративный фон — неоновые круги */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full
                        bg-electric/10 blur-3xl"
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full
                        bg-purple-600/10 blur-3xl"
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Cine<span className="text-electric">Vault</span>
          </h1>
          <p className="text-slate-400 text-sm">Твоя видеоколлекция</p>
        </div>

        {/* Карточка */}
        <div className="card p-6 md:p-8 shadow-neon-lg">
          {/* Табы */}
          <div className="flex gap-2 mb-6 p-1 bg-dark-bg rounded-xl border border-dark-border">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-electric/15 text-electric"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-electric/15 text-electric"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Field
                icon={<User size={18} />}
                label="Имя"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Как тебя зовут?"
                required
                minLength={2}
              />
            )}

            <Field
              icon={<Mail size={18} />}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Пароль
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "register" ? "Минимум 6 символов" : "••••••••"
                  }
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl
                             pl-11 pr-11 py-3 text-white placeholder-slate-500
                             focus:border-electric focus:shadow-neon transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-slate-500 hover:text-slate-300 transition"
                  aria-label={
                    showPassword ? "Скрыть пароль" : "Показать пароль"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Ошибки */}
            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg
                              bg-red-500/10 border border-red-500/40 text-red-300 text-sm"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                  {emailNotVerified && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="mt-2 text-xs underline text-electric
                                 hover:text-white transition disabled:opacity-50"
                    >
                      {resending ? "Отправляю..." : "Переотправить письмо"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Успех */}
            {success && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg
                              bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm"
              >
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-electric w-full py-3 flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === "login" ? "Вхожу..." : "Создаю аккаунт..."}
                </>
              ) : (
                <>
                  {mode === "login" ? "Войти" : "Создать аккаунт"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Тестовые аккаунты */}
          {mode === "login" && (
            <div className="mt-6 pt-5 border-t border-dark-border">
              <p className="text-xs text-slate-500 mb-3 text-center">
                Тестовые аккаунты (пароль{" "}
                <span className="text-electric font-mono">demo123</span>)
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ["demo@cinevault.com", "Демо"],
                  ["nolan.fan@cinevault.com", "Фанат Нолана"],
                  ["anime.lover@cinevault.com", "Анимешник"],
                  ["classic@cinevault.com", "Классика"],
                  ["marvelfan@cinevault.com", "Блокбастеры"],
                ].map(([mail, label]) => (
                  <button
                    key={mail}
                    type="button"
                    onClick={() => {
                      setEmail(mail);
                      setPassword("demo123");
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                               text-xs text-slate-400 hover:text-white
                               bg-dark-bg border border-dark-border hover:border-electric/40
                               transition-all text-left"
                  >
                    <span>{label}</span>
                    <span className="text-slate-600 font-mono">{mail}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 CineVault — управляй своей коллекцией
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  minLength,
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="w-full bg-dark-bg border border-dark-border rounded-xl
                     pl-11 pr-4 py-3 text-white placeholder-slate-500
                     focus:border-electric focus:shadow-neon transition-all text-sm"
        />
      </div>
    </div>
  );
}
