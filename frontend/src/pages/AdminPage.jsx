import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Mail,
  MailX,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Crown,
  KeyRound,
  Search,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import {
  adminGetStats,
  adminGetUsers,
  adminUpdateUser,
  adminResetPassword,
  adminResendVerify,
  adminDeleteUser,
  adminGetFilms,
  adminDeleteFilm,
} from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";

const FILMS_PER_PAGE = 50;

export default function AdminPage({ onBack }) {
  const { user: me } = useAuth();
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  async function loadStats() {
    try {
      const s = await adminGetStats();
      setStats(s);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadStats().finally(() => setLoading(false));
  }, []);

  function showToast(text, type = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="min-h-screen bg-blood-bg text-white">
      {/* Хедер */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md border-b border-blood-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
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
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Crown size={22} className="text-blood-accent shrink-0" />
            <h1 className="title-display text-2xl md:text-3xl leading-none">
              АДМИНКА
            </h1>
          </div>
          <motion.button
            onClick={() => {
              loadStats();
              if (tab === "films")
                window.dispatchEvent(new Event("admin:reload-films"));
            }}
            className="p-2 rounded-sm text-blood-muted border border-blood-border
                       hover:text-blood-accent hover:border-blood-accent hover:shadow-glow-sm
                       transition-all"
            whileHover={{ scale: 1.05, rotate: 45 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Обновить"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </motion.button>
        </div>

        {/* Табы */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          <TabButton
            active={tab === "users"}
            onClick={() => setTab("users")}
            icon={Users}
          >
            Пользователи
          </TabButton>
          <TabButton
            active={tab === "films"}
            onClick={() => setTab("films")}
            icon={Film}
          >
            Фильмы
          </TabButton>
        </div>
      </header>

      <main className="max-w-6xl mx-auto pt-32 pb-24 px-4">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-32 left-1/2 -translate-x-1/2 z-40
                          px-4 py-3 rounded-sm border backdrop-blur-md
                          flex items-center gap-2 text-sm uppercase tracking-wider font-mono
                          ${
                            toast.type === "error"
                              ? "bg-blood-accent/15 border-blood-accent text-blood-glow"
                              : "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                          }`}
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              {toast.type === "error" ? (
                <AlertCircle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div
            className="mb-4 p-4 rounded-sm bg-blood-accent/10 border-l-2 border-blood-accent
                          text-blood-glow text-sm"
          >
            Ошибка: {error}
          </div>
        )}

        {tab === "users" && stats && (
          <StatsTiles
            stats={stats}
            onUsers={() => setTab("users")}
            onFilms={() => setTab("films")}
            onSelectFilter={(filter) => {
              window.dispatchEvent(
                new CustomEvent("admin:filter-users", { detail: filter }),
              );
            }}
          />
        )}

        {tab === "users" && (
          <UsersTab me={me} onStatsChanged={loadStats} showToast={showToast} />
        )}

        {tab === "films" && <FilmsTab showToast={showToast} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 text-sm
                  font-bold uppercase tracking-wider transition-all
                  ${active ? "text-blood-glow" : "text-blood-muted hover:text-white"}`}
      style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.06em" }}
    >
      <Icon size={15} />
      {children}
      {active && (
        <motion.span
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-blood-accent"
          style={{ boxShadow: "0 0 12px rgba(229,9,20,0.8)" }}
          layoutId="admin-tab"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  );
}

// ============================================================
// Плитки статистики
// ============================================================
function StatsTiles({ stats, onUsers, onFilms, onSelectFilter }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <StatTile
        icon={Users}
        label="Пользователи"
        value={stats.totalUsers}
        onClick={() => {
          onUsers();
          onSelectFilter("all");
        }}
      />
      <StatTile
        icon={UserCheck}
        label="Подтверждены"
        value={stats.verifiedUsers}
        accent
        onClick={() => {
          onUsers();
          onSelectFilter("verified");
        }}
      />
      <StatTile
        icon={MailX}
        label="Без email"
        value={stats.unverifiedUsers}
        warn={stats.unverifiedUsers > 0}
        onClick={() => {
          onUsers();
          onSelectFilter("unverified");
        }}
      />
      <StatTile
        icon={Crown}
        label="Админы"
        value={stats.admins}
        onClick={() => {
          onUsers();
          onSelectFilter("admins");
        }}
      />
      <StatTile
        icon={Shield}
        label="Фильмов"
        value={stats.totalFilms}
        onClick={onFilms}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent, warn, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative bg-blood-card p-4 text-left rounded-sm border
                  transition-all overflow-hidden group
                  hover:border-blood-accent hover:shadow-glow
                  ${accent ? "border-blood-accent/60" : ""}
                  ${warn ? "border-amber-500/60" : "border-blood-border"}`}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <span
        className="absolute top-0 left-0 right-0 h-[2px] bg-blood-accent
                       scale-x-0 group-hover:scale-x-100 transition-transform
                       duration-300 origin-left shadow-glow"
      />

      <div className="flex items-center gap-2 mb-2">
        <Icon
          size={14}
          className={
            accent
              ? "text-blood-accent"
              : warn
                ? "text-amber-400"
                : "text-blood-muted"
          }
        />
        <p className="text-[10px] text-blood-muted uppercase tracking-[0.15em] font-mono truncate">
          {label}
        </p>
      </div>
      <p
        className={`text-3xl font-bold num-mono
                     ${accent ? "text-blood-accent" : warn ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </p>
    </motion.button>
  );
}

// ============================================================
// USERS TAB
// ============================================================
function UsersTab({ me, onStatsChanged, showToast }) {
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionUserId, setActionUserId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setFetching(true);
    try {
      const u = await adminGetUsers();
      setUsers(u.users || []);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    load();
    function onFilter(e) {
      setFilter(e.detail || "all");
      setSearch("");
    }
    window.addEventListener("admin:filter-users", onFilter);
    return () => window.removeEventListener("admin:filter-users", onFilter);
  }, []);

  async function updateUser(id, updates) {
    setActionUserId(id);
    try {
      const res = await adminUpdateUser(id, updates);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...res.user } : u)),
      );
      showToast("Обновлено");
      onStatsChanged?.();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionUserId(null);
    }
  }

  async function resendVerify(u) {
    setActionUserId(u.id);
    try {
      const res = await adminResendVerify(u.id);
      if (res.verificationUrl) {
        if (
          confirm(`Токен создан.\n\nОткрыть ссылку?\n${res.verificationUrl}`)
        ) {
          window.open(res.verificationUrl, "_blank");
          setTimeout(load, 1500);
        }
      } else {
        showToast("Письмо отправлено");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionUserId(null);
    }
  }

  async function resetPassword(u) {
    const newPass = prompt(`Новый пароль для ${u.email}:`, "demo123");
    if (!newPass) return;
    if (newPass.length < 6)
      return showToast("Пароль минимум 6 символов", "error");
    setActionUserId(u.id);
    try {
      await adminResetPassword(u.id, newPass);
      showToast(`Пароль: "${newPass}"`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionUserId(null);
    }
  }

  async function deleteUser(u) {
    setActionUserId(u.id);
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setConfirmDelete(null);
      showToast(`${u.email} удалён`);
      onStatsChanged?.();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionUserId(null);
    }
  }

  const filtered = useMemo(() => {
    let list = users;
    if (filter === "verified") list = list.filter((u) => u.email_verified);
    if (filter === "unverified") list = list.filter((u) => !u.email_verified);
    if (filter === "admins") list = list.filter((u) => u.is_admin);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.full_name || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, filter, search]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-accent pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email или имени..."
            className="w-full bg-blood-card border border-blood-border rounded-sm
                       pl-11 pr-4 py-2.5 text-white placeholder-blood-muted/60 text-sm
                       focus:border-blood-accent focus:shadow-glow-sm transition"
          />
        </div>

        {filter !== "all" && (
          <motion.button
            onClick={() => setFilter("all")}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-sm
                       bg-blood-accent/15 border border-blood-accent text-blood-glow
                       uppercase tracking-wider"
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              letterSpacing: "0.06em",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {filter === "verified" && (
              <>
                <UserCheck size={12} /> Подтверждены
              </>
            )}
            {filter === "unverified" && (
              <>
                <MailX size={12} /> Без email
              </>
            )}
            {filter === "admins" && (
              <>
                <Crown size={12} /> Админы
              </>
            )}
            <X size={12} />
          </motion.button>
        )}
      </div>

      <div
        className="hidden md:grid grid-cols-12 gap-3 px-3 py-2
                      text-[10px] text-blood-muted uppercase tracking-[0.15em] font-mono"
      >
        <div className="col-span-4">Пользователь</div>
        <div className="col-span-2 text-center">Email</div>
        <div className="col-span-1 text-center">Роль</div>
        <div className="col-span-1 text-center">Фильмов</div>
        <div className="col-span-4 text-right">Действия</div>
      </div>

      {fetching && users.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-blood-accent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-blood-muted">
          <Users size={40} className="mx-auto mb-3 opacity-50" />
          <p className="uppercase tracking-wider text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              me={me}
              busy={actionUserId === u.id}
              onToggleAdmin={() => updateUser(u.id, { is_admin: !u.is_admin })}
              onToggleVerify={() =>
                updateUser(u.id, { email_verified: !u.email_verified })
              }
              onResend={() => resendVerify(u)}
              onResetPassword={() => resetPassword(u)}
              onDelete={() => setConfirmDelete(u)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="bg-blood-card rounded-sm p-6 max-w-md w-full
                         border border-blood-accent/50 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blood-accent shadow-glow" />
              <h3 className="title-display text-2xl text-blood-glow mb-2">
                УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ?
              </h3>
              <p className="text-sm text-blood-muted mb-1 font-mono">
                {confirmDelete.email}
              </p>
              <p className="text-[11px] text-blood-muted mb-5">
                Необратимо. Все{" "}
                <b className="text-blood-glow">{confirmDelete.films_count}</b>{" "}
                записей его библиотеки будут удалены.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="btn-ghost flex-1 py-2.5 text-sm"
                >
                  ОТМЕНА
                </button>
                <motion.button
                  onClick={() => deleteUser(confirmDelete)}
                  disabled={actionUserId === confirmDelete.id}
                  className="flex-1 py-2.5 rounded-sm bg-blood-accent text-white
                             flex items-center justify-center gap-2
                             hover:bg-blood-glow shadow-glow disabled:opacity-60"
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    letterSpacing: "0.06em",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {actionUserId === confirmDelete.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  УДАЛИТЬ
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// FILMS TAB
// ============================================================
function FilmsTab({ showToast }) {
  const [films, setFilms] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / FILMS_PER_PAGE));

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetFilms({
        search: debouncedSearch,
        limit: FILMS_PER_PAGE,
        offset: (page - 1) * FILMS_PER_PAGE,
      });
      setFilms(data.films || []);
      setTotal(data.total || 0);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [debouncedSearch, page]);

  useEffect(() => {
    function onReload() {
      load();
    }
    window.addEventListener("admin:reload-films", onReload);
    return () => window.removeEventListener("admin:reload-films", onReload);
  }, [debouncedSearch, page]);

  function goToPage(p) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(film) {
    setDeletingId(film.id);
    try {
      await adminDeleteFilm(film.id);
      setFilms((prev) => prev.filter((f) => f.id !== film.id));
      setTotal((t) => t - 1);
      setConfirmDelete(null);
      showToast(`«${film.title}» удалён`);
      setTimeout(load, 100);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  const startItem = total === 0 ? 0 : (page - 1) * FILMS_PER_PAGE + 1;
  const endItem = Math.min(page * FILMS_PER_PAGE, total);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-accent pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или режиссёру..."
            className="w-full bg-blood-card border border-blood-border rounded-sm
                       pl-11 pr-4 py-2.5 text-white placeholder-blood-muted/60 text-sm
                       focus:border-blood-accent focus:shadow-glow-sm transition"
          />
        </div>
        <p className="text-[10px] text-blood-muted shrink-0 font-mono uppercase tracking-wider">
          {total === 0 ? "Ничего" : `${startItem}–${endItem} / ${total}`}
        </p>
      </div>

      {loading && films.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-blood-accent animate-spin" />
        </div>
      ) : films.length === 0 ? (
        <div className="text-center py-16 text-blood-muted">
          <Film size={40} className="mx-auto mb-3 opacity-50" />
          <p className="uppercase tracking-wider text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <div
          className={`space-y-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
        >
          {films.map((film) => (
            <div
              key={film.id}
              className="bg-blood-card border border-blood-border
                                          rounded-sm p-2.5 flex items-center gap-3
                                          hover:border-blood-accent/60 transition-all"
            >
              <div
                className="w-12 h-16 rounded-sm overflow-hidden shrink-0
                              bg-black border border-blood-border
                              flex items-center justify-center relative"
              >
                {film.poster_url ? (
                  <img
                    src={film.poster_url}
                    alt={film.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <Film size={20} className="text-blood-muted" />
                )}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blood-accent" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {film.title}
                  {film.year && (
                    <span className="text-blood-muted font-normal font-mono">
                      {" "}
                      · {film.year}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-blood-muted truncate uppercase tracking-wider font-mono">
                  {film.director || "—"} ·{" "}
                  {film.type === "series" ? "Сериал" : "Фильм"}
                </p>
                <p className="text-[10px] text-blood-muted/70 mt-0.5 font-mono">
                  В {film.users_count}{" "}
                  {film.users_count === 1 ? "коллекции" : "коллекциях"}
                </p>
              </div>

              <motion.button
                onClick={() => setConfirmDelete(film)}
                disabled={deletingId === film.id}
                className="p-2 rounded-sm text-blood-muted
                           hover:text-blood-glow hover:bg-blood-accent/10
                           transition shrink-0 disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Удалить из каталога"
              >
                {deletingId === film.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </motion.button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
      )}

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="bg-blood-card rounded-sm p-6 max-w-md w-full
                         border border-blood-accent/50 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blood-accent shadow-glow" />
              <h3 className="title-display text-2xl text-blood-glow mb-2">
                УДАЛИТЬ ИЗ КАТАЛОГА?
              </h3>
              <p className="text-sm text-white mb-2">{confirmDelete.title}</p>
              <p className="text-[11px] text-blood-muted mb-5">
                Фильм исчезнет из глобального каталога и удалится из{" "}
                <b className="text-blood-glow">{confirmDelete.users_count}</b>{" "}
                {confirmDelete.users_count === 1 ? "коллекции" : "коллекций"}.
                Необратимо.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="btn-ghost flex-1 py-2.5 text-sm"
                >
                  ОТМЕНА
                </button>
                <motion.button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingId === confirmDelete.id}
                  className="flex-1 py-2.5 rounded-sm bg-blood-accent text-white
                             flex items-center justify-center gap-2
                             hover:bg-blood-glow shadow-glow disabled:opacity-60"
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    letterSpacing: "0.06em",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {deletingId === confirmDelete.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  УДАЛИТЬ
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// Пагинация
// ============================================================
function Pagination({ page, totalPages, onChange }) {
  const pages = useMemo(
    () => getPaginationRange(page, totalPages),
    [page, totalPages],
  );

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <motion.button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-2 rounded-sm text-[11px]
                     font-bold uppercase tracking-wider
                     border border-blood-border text-blood-muted
                     hover:border-blood-accent hover:text-blood-glow
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:border-blood-border disabled:hover:text-blood-muted
                     transition-all"
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <ChevronLeft size={13} />
          Назад
        </motion.button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`dots-${idx}`}
                className="px-2 text-blood-muted/50 select-none"
              >
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <motion.button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[36px] px-2.5 py-2 rounded-sm text-xs font-bold num-mono
                          border transition-all
                          ${
                            isActive
                              ? "bg-blood-accent/20 border-blood-accent text-blood-glow shadow-glow-sm"
                              : "bg-blood-card border-blood-border text-blood-muted hover:border-blood-accent/60 hover:text-white"
                          }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {p}
            </motion.button>
          );
        })}

        <motion.button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-sm text-[11px]
                     font-bold uppercase tracking-wider
                     border border-blood-border text-blood-muted
                     hover:border-blood-accent hover:text-blood-glow
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all"
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Вперёд
          <ChevronRight size={13} />
        </motion.button>
      </div>

      <p className="text-[10px] text-blood-muted font-mono uppercase tracking-wider">
        Страница {page} / {totalPages}
      </p>
    </div>
  );
}

function getPaginationRange(current, total) {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }
  const result = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) result.push(prev + 1);
      else if (i - prev > 2) result.push("...");
    }
    result.push(i);
    prev = i;
  }
  return result;
}

// ============================================================
// UserRow
// ============================================================
function UserRow({
  u,
  me,
  busy,
  onToggleAdmin,
  onToggleVerify,
  onResend,
  onResetPassword,
  onDelete,
}) {
  const isMe = u.id === me?.id;
  const initials = (u.full_name || u.name || u.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`bg-blood-card rounded-sm p-3 md:grid md:grid-cols-12 md:gap-3 md:items-center
                     border transition-all
                     ${
                       isMe
                         ? "border-blood-accent/40"
                         : "border-blood-border hover:border-blood-accent/40"
                     }`}
    >
      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-sm overflow-hidden shrink-0
                        bg-gradient-to-br from-blood-accent to-blood-dim
                        border border-blood-border flex items-center justify-center
                        text-white font-bold text-xs"
        >
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              alt={u.name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
            {u.full_name || u.name}
            {u.is_admin && (
              <Crown size={12} className="text-blood-accent shrink-0" />
            )}
            {isMe && (
              <span
                className="text-[9px] text-blood-glow border border-blood-accent/50
                               rounded-sm px-1 shrink-0 uppercase tracking-wider"
                style={{ fontFamily: "Bebas Neue, sans-serif" }}
              >
                вы
              </span>
            )}
          </p>
          <p className="text-[10px] text-blood-muted truncate md:hidden font-mono">
            {u.email}
          </p>
        </div>
      </div>

      <div className="hidden md:block md:col-span-2 text-center">
        <p
          className="text-[11px] text-blood-muted truncate font-mono"
          title={u.email}
        >
          {u.email}
        </p>
      </div>

      <div className="hidden md:flex md:col-span-1 justify-center">
        <button
          onClick={onToggleAdmin}
          disabled={busy || isMe}
          title={
            isMe
              ? "Нельзя изменить свою роль"
              : u.is_admin
                ? "Снять админа"
                : "Сделать админом"
          }
          className={`text-[10px] px-2 py-1 rounded-sm border
                      transition-all uppercase tracking-wider font-bold
                      disabled:opacity-60 disabled:cursor-not-allowed
                      ${
                        u.is_admin
                          ? "bg-blood-accent/15 border-blood-accent/60 text-blood-glow"
                          : "bg-black/40 border-blood-border text-blood-muted hover:border-blood-accent/50"
                      }`}
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
        >
          {u.is_admin ? "👑 АДМИН" : "ЮЗЕР"}
        </button>
      </div>

      <div className="hidden md:block md:col-span-1 text-center">
        <p className="text-sm font-bold text-white num-mono">{u.films_count}</p>
        <p className="text-[9px] text-blood-muted uppercase tracking-wider font-mono">
          {u.watched_count} просм.
        </p>
      </div>

      <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap mt-3 md:mt-0 md:justify-end">
        <button
          onClick={onToggleVerify}
          disabled={busy}
          className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-sm border
                      transition-all disabled:opacity-50 uppercase tracking-wider font-bold
                      ${
                        u.email_verified
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                          : "bg-blood-accent/10 border-blood-accent/50 text-blood-glow"
                      }`}
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
        >
          {u.email_verified ? <Mail size={11} /> : <MailX size={11} />}
          {u.email_verified ? "ПОДТВ." : "НЕ ПОДТВ."}
        </button>

        {!u.email_verified && (
          <motion.button
            onClick={onResend}
            disabled={busy}
            className="p-2 rounded-sm text-blood-muted hover:text-blood-accent
                       hover:bg-blood-accent/10 transition disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Переотправить письмо"
          >
            <Mail size={13} />
          </motion.button>
        )}

        <motion.button
          onClick={onResetPassword}
          disabled={busy}
          className="p-2 rounded-sm text-blood-muted hover:text-blood-accent
                     hover:bg-blood-accent/10 transition disabled:opacity-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Сбросить пароль"
        >
          <KeyRound size={13} />
        </motion.button>

        {!isMe && (
          <motion.button
            onClick={onDelete}
            disabled={busy}
            className="p-2 rounded-sm text-blood-muted hover:text-blood-glow
                       hover:bg-blood-accent/10 transition disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Удалить"
          >
            <Trash2 size={13} />
          </motion.button>
        )}

        {busy && (
          <Loader2 size={13} className="text-blood-accent animate-spin" />
        )}
      </div>
    </div>
  );
}
