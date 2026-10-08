import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { API_URL } from "../config.js";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | valid | invalid | success
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Проверяем токен при загрузке
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");

    if (!t) {
      setStatus("invalid");
      setErrorMessage("Токен не найден в ссылке");
      return;
    }

    setToken(t);

    fetch(`${API_URL}/auth/check-reset-token?token=${t}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.valid) {
          setStatus("valid");
          setUserEmail(data.email || "");
        } else {
          setStatus("invalid");
          setErrorMessage(data.error || "Невалидная или просроченная ссылка");
        }
      })
      .catch(() => {
        setStatus("invalid");
        setErrorMessage("Ошибка сети. Проверь соединение.");
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError("Пароль минимум 6 символов");
      return;
    }
    if (password !== password2) {
      setSubmitError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Не удалось сменить пароль");
      }

      setStatus("success");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function goToLogin() {
    window.location.href = "./";
  }

  return (
    <div className="min-h-screen bg-blood-bg text-white relative overflow-hidden">
      {/* Красное свечение на фоне */}
      <div className="fixed inset-0 pointer-events-none z-0">
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
            <p className="text-sm uppercase tracking-[0.3em] text-blood-muted mt-4 font-mono">
              СБРОС ПАРОЛЯ
            </p>
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
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-blood-accent" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-blood-accent" />

            <div className="p-6 md:p-8">
              {/* ЗАГРУЗКА */}
              {status === "loading" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <Loader2
                    size={40}
                    className="text-blood-accent animate-spin"
                  />
                  <p className="text-blood-muted text-sm font-mono uppercase tracking-wider">
                    Проверяю ссылку...
                  </p>
                </div>
              )}

              {/* НЕВАЛИДНАЯ ССЫЛКА */}
              {status === "invalid" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="flex justify-center mb-5">
                    <div
                      className="w-20 h-20 rounded-sm bg-blood-accent/10 border-2 border-blood-accent/40
                                    flex items-center justify-center"
                    >
                      <XCircle size={44} className="text-blood-glow" />
                    </div>
                  </div>
                  <h2 className="title-display text-3xl text-blood-glow mb-3">
                    ССЫЛКА НЕ РАБОТАЕТ
                  </h2>
                  <p className="text-sm text-blood-muted mb-6">
                    {errorMessage}
                  </p>
                  <motion.button
                    onClick={goToLogin}
                    className="btn-blood w-full py-3 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ЗАПРОСИТЬ НОВУЮ ССЫЛКУ
                    <ArrowRight size={18} />
                  </motion.button>
                </motion.div>
              )}

              {/* ФОРМА СБРОСА */}
              {status === "valid" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="title-display text-3xl text-white mb-2">
                    НОВЫЙ ПАРОЛЬ
                  </h2>
                  {userEmail && (
                    <p className="text-[11px] text-blood-muted mb-6 font-mono truncate">
                      {userEmail}
                    </p>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-[11px] text-blood-muted font-mono uppercase tracking-wider mb-2 block">
                        Новый пароль
                      </label>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-muted pointer-events-none"
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          required
                          minLength={6}
                          autoFocus
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
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-blood-muted font-mono uppercase tracking-wider mb-2 block">
                        Повтори пароль
                      </label>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-muted pointer-events-none"
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password2}
                          onChange={(e) => setPassword2(e.target.value)}
                          placeholder="Ещё раз тот же пароль"
                          required
                          minLength={6}
                          className="w-full bg-black/40 border border-blood-border rounded-sm
                                     pl-12 pr-4 py-3 text-white placeholder-blood-muted/50
                                     focus:border-blood-accent focus:shadow-glow-sm
                                     transition-all duration-200 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {submitError && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-start gap-2 p-3 rounded-sm
                                     bg-blood-accent/10 border-l-2 border-blood-accent
                                     text-blood-glow text-sm"
                        >
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p>{submitError}</p>
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
                            СОХРАНЯЮ...
                          </>
                        ) : (
                          <>
                            СМЕНИТЬ ПАРОЛЬ
                            <ArrowRight size={18} />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* УСПЕХ */}
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="flex justify-center mb-5">
                    <motion.div
                      className="w-20 h-20 rounded-sm bg-emerald-500/10 border-2 border-emerald-500/40
                                 flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <CheckCircle2 size={44} className="text-emerald-400" />
                    </motion.div>
                  </div>
                  <h2 className="title-display text-3xl text-emerald-400 mb-3">
                    ПАРОЛЬ ИЗМЕНЁН
                  </h2>
                  <p className="text-sm text-blood-muted mb-6">
                    Теперь можешь войти с новым паролем
                  </p>
                  <motion.button
                    onClick={goToLogin}
                    className="btn-blood w-full py-3 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ПЕРЕЙТИ КО ВХОДУ
                    <ArrowRight size={18} />
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>

          <p className="text-center text-[10px] text-blood-muted uppercase tracking-[0.3em] mt-8 font-mono">
            © 2026 CINEVAULT · V1.0
          </p>
        </div>
      </div>
    </div>
  );
}
