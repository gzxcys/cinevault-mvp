import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Токен подтверждения не найден в ссылке");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
          setMessage(data.message || "Email подтверждён!");
          setEmail(data.email);
        } else {
          setStatus("error");
          setMessage(data.error || "Не удалось подтвердить email");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Ошибка сети. Проверь соединение.");
      });
  }, []);

  function goToLogin() {
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      {/* Декоративный фон */}
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Cine<span className="text-electric">Vault</span>
          </h1>
        </div>

        <div className="card p-8 shadow-neon-lg text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 size={56} className="text-electric animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Проверяю ссылку...</h2>
              <p className="text-slate-400 text-sm">Это займёт секунду</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 rounded-full bg-emerald-500/15
                                border-2 border-emerald-500/40
                                flex items-center justify-center"
                >
                  <CheckCircle2 size={44} className="text-emerald-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2 text-emerald-400">
                Готово!
              </h2>
              <p className="text-slate-300 mb-1">{message}</p>
              {email && (
                <p className="text-xs text-slate-500 mb-6">
                  <Mail size={12} className="inline mr-1" />
                  {email}
                </p>
              )}
              <button
                onClick={goToLogin}
                className="btn-electric w-full py-3 mt-4 flex items-center justify-center gap-2"
              >
                Перейти ко входу
                <ArrowRight size={18} />
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 rounded-full bg-red-500/15
                                border-2 border-red-500/40
                                flex items-center justify-center"
                >
                  <XCircle size={44} className="text-red-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2 text-red-400">
                Не получилось
              </h2>
              <p className="text-slate-300 mb-6">{message}</p>
              <button
                onClick={goToLogin}
                className="btn-ghost w-full py-3 flex items-center justify-center gap-2"
              >
                Вернуться ко входу
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 CineVault
        </p>
      </div>
    </div>
  );
}
