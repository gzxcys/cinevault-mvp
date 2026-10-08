import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  Film,
  Ticket,
  Popcorn,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { API_URL } from "../config.js";

// ============================================================
// Плавающие кинематографичные частицы
// ============================================================
const PARTICLES = [
  {
    Icon: Film,
    x: "8%",
    y: "15%",
    size: 48,
    duration: 22,
    delay: 0,
    rotate: -15,
  },
  {
    Icon: Ticket,
    x: "85%",
    y: "20%",
    size: 56,
    duration: 26,
    delay: 2,
    rotate: 20,
  },
  {
    Icon: Popcorn,
    x: "12%",
    y: "75%",
    size: 44,
    duration: 30,
    delay: 4,
    rotate: 10,
  },
  {
    Icon: Film,
    x: "78%",
    y: "80%",
    size: 40,
    duration: 24,
    delay: 1,
    rotate: -25,
  },
  {
    Icon: Ticket,
    x: "45%",
    y: "5%",
    size: 36,
    duration: 28,
    delay: 6,
    rotate: 15,
  },
  {
    Icon: Popcorn,
    x: "92%",
    y: "55%",
    size: 38,
    duration: 32,
    delay: 3,
    rotate: -10,
  },
  {
    Icon: Film,
    x: "5%",
    y: "50%",
    size: 42,
    duration: 34,
    delay: 5,
    rotate: 30,
  },
];

function ParticlesLayer() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {PARTICLES.map((p, i) => {
        const Icon = p.Icon;
        return (
          <motion.div
            key={i}
            className="absolute text-blood-accent"
            style={{ left: p.x, top: p.y, rotate: `${p.rotate}deg` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.04, 0.12, 0.04],
              y: [0, -30, 0],
              rotate: [p.rotate, p.rotate + 15, p.rotate],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon size={p.size} strokeWidth={1} />
          </motion.div>
        );
      })}
    </div>
  );
}

function RaysLayer() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(229,9,20,0.10) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,45,45,0.08) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 15,
          delay: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const { login, register, emailNotVerified, resendVerification } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resending, setResending] = useState(false);

  // Модалка "Забыл пароль?"
  const [showForgot, setShowForgot] = useState(false);

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
      } else {
        const data = await register(email, password, name);
        setSuccess(
          data.emailSent
            ? "Аккаунт создан. Проверь почту и подтверди email."
            : "Аккаунт создан, но письмо не ушло. Проверь SMTP.",
        );
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
      setSuccess("Письмо отправлено повторно.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-blood-bg text-white relative overflow-hidden">
      <ParticlesLayer />
      <RaysLayer />

      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Лого */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="title-display text-6xl md:text-7xl mb-2 relative inline-block">
              <span className="text-white">CINE</span>
              <span className="text-blood-accent relative">
                VAULT
                <motion.span
                  className="absolute left-0 right-0 -bottom-2 h-[3px] bg-blood-accent"
                  style={{ boxShadow: "0 0 20px rgba(229,9,20,0.8)" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    delay: 0.5,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </span>
            </h1>
            <motion.p
              className="text-sm uppercase tracking-[0.3em] text-blood-muted mt-4 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              ТВОЯ ВИДЕОКОЛЛЕКЦИЯ
            </motion.p>
          </motion.div>

          {/* Карточка */}
          <motion.div
            className="relative bg-blood-card border border-blood-border rounded-sm
                       clip-corner overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r
                            from-transparent via-blood-accent to-transparent shadow-glow"
            />
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blood-accent" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-blood-accent" />
            <div className="absolute top-0 right-0 w-32 h-32 hatch opacity-40 pointer-events-none" />

            <div className="p-6 md:p-8">
              {/* Табы */}
              <div className="flex mb-8 border-b border-blood-border">
                {[
                  { id: "login", label: "ВХОД" },
                  { id: "register", label: "РЕГИСТРАЦИЯ" },
                ].map((t) => {
                  const isActive = mode === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => switchMode(t.id)}
                      className={`relative flex-1 py-3 title-display text-2xl tracking-wider
                                  transition-colors duration-200
                                  ${
                                    isActive
                                      ? "text-blood-accent"
                                      : "text-blood-muted hover:text-white"
                                  }`}
                    >
                      {t.label}
                      {isActive && (
                        <motion.span
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-blood-accent"
                          style={{ boxShadow: "0 0 12px rgba(229,9,20,0.8)" }}
                          layoutId="tab-underline"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 35,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {mode === "register" && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Field
                        icon={<User size={16} />}
                        label="ИМЯ"
                        type="text"
                        value={name}
                        onChange={setName}
                        placeholder="Как тебя зовут?"
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field
                  icon={<Mail size={16} />}
                  label="EMAIL"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  required
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] text-blood-muted font-mono uppercase tracking-wider">
                      ПАРОЛЬ
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-[10px] text-blood-accent hover:text-blood-glow
                                   hover:underline uppercase tracking-wider font-mono
                                   transition-colors"
                      >
                        Забыл пароль?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-muted pointer-events-none"
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
                      className="w-full bg-black/40 border border-blood-border rounded-sm
                                 pl-12 pr-12 py-3 text-white placeholder-blood-muted/50
                                 focus:border-blood-accent focus:shadow-glow-sm
                                 transition-all duration-200 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blood-muted
                                 hover:text-blood-accent transition"
                      aria-label={showPassword ? "Скрыть" : "Показать"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

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
                      <div className="flex-1">
                        <p>{error}</p>
                        {emailNotVerified && (
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="mt-2 text-xs underline text-blood-glow
                                       hover:text-white transition disabled:opacity-50"
                          >
                            {resending
                              ? "Отправляю..."
                              : "Переотправить письмо"}
                          </button>
                        )}
                      </div>
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
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <p>{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="btn-blood w-full py-4 flex items-center justify-center gap-2
                             relative overflow-hidden group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span
                    className="absolute inset-0 hatch opacity-0 group-hover:opacity-100
                                   transition-opacity duration-300"
                  />
                  <span className="relative flex items-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {mode === "login" ? "ВХОЖУ..." : "СОЗДАЮ..."}
                      </>
                    ) : (
                      <>
                        {mode === "login" ? "ВОЙТИ" : "СОЗДАТЬ АККАУНТ"}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              {/* Тестовые аккаунты */}
              {mode === "login" && (
                <motion.div
                  className="mt-8 pt-6 border-t border-blood-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <p
                    className="text-[10px] text-blood-muted uppercase tracking-[0.2em]
                                mb-3 text-center font-mono"
                  >
                    ТЕСТОВЫЕ АККАУНТЫ ·{" "}
                    <span className="text-blood-accent">DEMO123</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      ["demo@cinevault.com", "ДЕМО", "👑"],
                      ["nolan.fan@cinevault.com", "ФАНАТ НОЛАНА", null],
                      ["anime.lover@cinevault.com", "АНИМЕШНИК", null],
                      ["classic@cinevault.com", "КЛАССИКА", null],
                      ["marvelfan@cinevault.com", "БЛОКБАСТЕРЫ", null],
                    ].map(([mail, label, icon]) => (
                      <motion.button
                        key={mail}
                        type="button"
                        onClick={() => {
                          setEmail(mail);
                          setPassword("demo123");
                        }}
                        className="flex items-center justify-between px-3 py-2.5 rounded-sm
                                   text-xs text-blood-muted hover:text-white
                                   bg-black/40 border border-blood-border
                                   hover:border-blood-accent hover:shadow-glow-sm
                                   transition-all duration-200 text-left group"
                        whileHover={{ x: 4 }}
                      >
                        <span className="flex items-center gap-2 font-mono uppercase tracking-wider">
                          {icon && <span>{icon}</span>}
                          {label}
                        </span>
                        <span
                          className="text-[10px] text-blood-muted/60 font-mono
                                         group-hover:text-blood-accent transition"
                        >
                          {mail}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-blood-accent" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-blood-accent" />
          </motion.div>

          <motion.p
            className="text-center text-[10px] text-blood-muted uppercase tracking-[0.3em] mt-8 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            © 2026 CINEVAULT · V1.0
          </motion.p>
        </div>
      </div>

      {/* Модалка "Забыл пароль?" */}
      <ForgotPasswordModal
        open={showForgot}
        onClose={() => setShowForgot(false)}
        initialEmail={email}
      />
    </div>
  );
}

// ============================================================
// Поле ввода
// ============================================================
function Field({ icon, label, type, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="text-[11px] text-blood-muted font-mono uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-muted pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-black/40 border border-blood-border rounded-sm
                     pl-12 pr-4 py-3 text-white placeholder-blood-muted/50
                     focus:border-blood-accent focus:shadow-glow-sm
                     transition-all duration-200 text-sm"
        />
      </div>
    </div>
  );
}

// ============================================================
// Модалка "Забыл пароль?"
// ============================================================
function ForgotPasswordModal({ open, onClose, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Синхронизируем email при открытии
  useState(() => {
    if (open) {
      setEmail(initialEmail || "");
      setSent(false);
      setError(null);
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Не удалось отправить письмо");

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setEmail("");
    setSent(false);
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm
                     flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full md:max-w-md bg-blood-card md:rounded-sm rounded-t-sm
                       border border-blood-accent/50 max-h-[95vh] flex flex-col
                       overflow-hidden relative shadow-glow-lg"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "110%", opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px] z-30
                            bg-gradient-to-r from-transparent via-blood-accent to-transparent"
            />

            {/* Шапка */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-blood-border shrink-0">
              <h2 className="title-display text-2xl text-white leading-none">
                ЗАБЫЛ ПАРОЛЬ
              </h2>
              <motion.button
                onClick={handleClose}
                className="p-2 rounded-sm bg-black/60 text-blood-muted border border-blood-border
                           hover:text-blood-accent hover:border-blood-accent hover:shadow-glow-sm
                           transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Закрыть"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Тело */}
            <div className="p-4 md:p-6">
              {!sent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-blood-muted mb-2 leading-relaxed">
                    Укажи email, привязанный к аккаунту. Мы отправим ссылку для
                    сброса пароля.
                  </p>

                  <div>
                    <label className="text-[11px] text-blood-muted font-mono uppercase tracking-wider mb-2 block">
                      EMAIL
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-muted pointer-events-none"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        className="w-full bg-black/40 border border-blood-border rounded-sm
                                   pl-12 pr-4 py-3 text-white placeholder-blood-muted/50
                                   focus:border-blood-accent focus:shadow-glow-sm
                                   transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

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
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={submitting || !email.trim()}
                    className="btn-blood w-full py-3.5 flex items-center justify-center gap-2
                               relative overflow-hidden group disabled:opacity-60"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span
                      className="absolute inset-0 hatch opacity-0 group-hover:opacity-100
                                     transition-opacity duration-300"
                    />
                    <span className="relative flex items-center gap-2">
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          ОТПРАВЛЯЮ...
                        </>
                      ) : (
                        <>
                          ОТПРАВИТЬ ССЫЛКУ
                          <ArrowRight size={16} />
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="flex justify-center mb-4">
                    <motion.div
                      className="w-16 h-16 rounded-sm bg-emerald-500/10
                                 border-2 border-emerald-500/40
                                 flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <CheckCircle2 size={36} className="text-emerald-400" />
                    </motion.div>
                  </div>
                  <h3 className="title-display text-2xl text-emerald-400 mb-2">
                    ПИСЬМО ОТПРАВЛЕНО
                  </h3>
                  <p className="text-sm text-blood-muted mb-1">
                    Проверь почту{" "}
                    <span className="text-white font-mono">{email}</span>
                  </p>
                  <p className="text-[11px] text-blood-muted/70 mb-5">
                    Ссылка действительна 1 час. Проверь папку «Спам».
                  </p>
                  <motion.button
                    onClick={handleClose}
                    className="btn-ghost w-full py-3 text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ЗАКРЫТЬ
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
