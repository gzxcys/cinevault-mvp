import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "cinevault_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailNotVerified, setEmailNotVerified] = useState(null);

  // При старте: если есть токен — проверяем его и получаем юзера
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  // Слушаем событие auth:expired из api.js
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setEmailNotVerified(null);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403 && data.code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(data.email);
        const err = new Error(data.error || "Email не подтверждён");
        err.code = "EMAIL_NOT_VERIFIED";
        err.email = data.email;
        throw err;
      }
      throw new Error(data.error || "Ошибка входа");
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setEmailNotVerified(null);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Ошибка регистрации");
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setEmailNotVerified(null);
  }, []);

  const resendVerification = useCallback(async (email) => {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Не удалось отправить письмо");
    return data;
  }, []);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    emailNotVerified,
    login,
    register,
    logout,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { TOKEN_KEY };
