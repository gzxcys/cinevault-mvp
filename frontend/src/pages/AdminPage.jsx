import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Users,
  Shield,
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
    <div className="min-h-screen bg-dark-bg text-white">
      <header className="sticky top-0 z-20 bg-dark-bg/90 backdrop-blur border-b border-dark-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Crown size={20} className="text-electric shrink-0" />
            <h1 className="text-lg font-bold truncate">Админ-панель</h1>
          </div>
          <button
            onClick={() => {
              loadStats();
              if (tab === "films")
                window.dispatchEvent(new Event("admin:reload-films"));
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-electric hover:bg-electric/10 transition"
            aria-label="Обновить"
          >
            <RefreshCw size={18} />
          </button>
        </div>

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

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        {toast && (
          <div
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-30
                          px-4 py-2 rounded-xl border backdrop-blur
                          flex items-center gap-2 text-sm
                          ${
                            toast.type === "error"
                              ? "bg-red-500/15 border-red-500/40 text-red-300"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {toast.text}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">
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
      className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium
                  transition-all border-b-2 -mb-px
                  ${
                    active
                      ? "text-electric border-electric bg-electric/5"
                      : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
                  }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

// ============================================================
// Плитки
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
        label="Фильмов в БД"
        value={stats.totalFilms}
        onClick={onFilms}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent, warn, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`card p-3 md:p-4 text-left transition-all w-full
                  hover:border-electric/60 hover:shadow-neon hover:-translate-y-0.5
                  active:scale-[0.98]
                  ${accent ? "border-electric/40" : ""}
                  ${warn ? "border-amber-500/40" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon
          size={14}
          className={
            accent
              ? "text-electric"
              : warn
                ? "text-amber-400"
                : "text-slate-500"
          }
        />
        <p className="text-[10px] md:text-[11px] text-slate-400 uppercase tracking-wide truncate">
          {label}
        </p>
      </div>
      <p
        className={`text-xl md:text-2xl font-bold
                     ${accent ? "text-electric" : warn ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </p>
    </button>
  );
}

// ============================================================
// ВКЛАДКА «Пользователи»
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
      showToast(`Пароль обновлён: "${newPass}"`);
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
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email или имени..."
            className="w-full bg-dark-card border border-dark-border rounded-xl
                       pl-11 pr-4 py-2.5 text-white placeholder-slate-500 text-sm
                       focus:border-electric transition"
          />
        </div>

        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg
                       bg-electric/10 border border-electric/40 text-electric
                       hover:bg-electric/20 transition"
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
          </button>
        )}
      </div>

      <div
        className="hidden md:grid grid-cols-12 gap-3 px-3 py-2
                      text-[11px] text-slate-500 uppercase tracking-wide"
      >
        <div className="col-span-4">Пользователь</div>
        <div className="col-span-2 text-center">Email</div>
        <div className="col-span-1 text-center">Роль</div>
        <div className="col-span-1 text-center">Фильмов</div>
        <div className="col-span-4 text-right">Действия</div>
      </div>

      {fetching && users.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-electric animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Users size={40} className="mx-auto mb-3 opacity-50" />
          <p>Ничего не найдено</p>
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

      {confirmDelete && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-dark-card rounded-2xl p-6 max-w-md w-full border border-red-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Удалить пользователя?</h3>
            <p className="text-sm text-slate-400 mb-1">
              <span className="text-white font-medium">
                {confirmDelete.email}
              </span>
            </p>
            <p className="text-xs text-slate-500 mb-5">
              Необратимо. Все {confirmDelete.films_count} записей его библиотеки
              будут удалены.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost flex-1 py-2.5"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                disabled={actionUserId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold
                           flex items-center justify-center gap-2 hover:bg-red-600
                           transition disabled:opacity-60"
              >
                {actionUserId === confirmDelete.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// ВКЛАДКА «Фильмы» — с пагинацией
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

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Загрузка страницы
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

  // Скролл наверх при смене страницы
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
      showToast(`«${film.title}» удалён из каталога`);
      // Если это была последняя позиция на странице — перейти на предыдущую
      if (films.length === 1 && page > 1) {
        setTimeout(() => setPage((p) => p - 1), 300);
      } else {
        setTimeout(load, 100);
      }
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
      {/* Поиск + инфо */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или режиссёру..."
            className="w-full bg-dark-card border border-dark-border rounded-xl
                       pl-11 pr-4 py-2.5 text-white placeholder-slate-500 text-sm
                       focus:border-electric transition"
          />
        </div>
        <p className="text-xs text-slate-500 shrink-0">
          {total === 0
            ? "Ничего не найдено"
            : `Показано ${startItem}–${endItem} из ${total}`}
        </p>
      </div>

      {/* Список */}
      {loading && films.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-electric animate-spin" />
        </div>
      ) : films.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Film size={40} className="mx-auto mb-3 opacity-50" />
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <div
          className={`space-y-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
        >
          {films.map((film) => (
            <div key={film.id} className="card p-2.5 flex items-center gap-3">
              <div
                className="w-12 h-16 rounded-md overflow-hidden shrink-0
                              bg-gradient-to-br from-electric/20 to-purple-600/20
                              flex items-center justify-center"
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
                  <Film size={20} className="text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {film.title}{" "}
                  {film.year && (
                    <span className="text-slate-500 font-normal">
                      ({film.year})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {film.director || "—"} ·{" "}
                  {film.type === "series" ? "Сериал" : "Фильм"}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  В {film.users_count}{" "}
                  {film.users_count === 1 ? "коллекции" : "коллекциях"}
                </p>
              </div>

              <button
                onClick={() => setConfirmDelete(film)}
                disabled={deletingId === film.id}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10
                           transition shrink-0 disabled:opacity-50"
                title="Удалить из каталога"
              >
                {deletingId === film.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-dark-card rounded-2xl p-6 max-w-md w-full border border-red-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">
              Удалить фильм из каталога?
            </h3>
            <p className="text-sm text-slate-300 mb-2">{confirmDelete.title}</p>
            <p className="text-xs text-slate-500 mb-5">
              Фильм исчезнет из глобального каталога и удалится из{" "}
              <b className="text-red-400">{confirmDelete.users_count}</b>{" "}
              {confirmDelete.users_count === 1 ? "коллекции" : "коллекций"}{" "}
              пользователей. Необратимо.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost flex-1 py-2.5"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold
                           flex items-center justify-center gap-2 hover:bg-red-600
                           transition disabled:opacity-60"
              >
                {deletingId === confirmDelete.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                     border border-dark-border text-slate-400
                     hover:border-electric/60 hover:text-electric
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:border-dark-border disabled:hover:text-slate-400
                     transition"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Назад</span>
        </button>

        {/* Номера */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`dots-${idx}`}
                className="px-2 text-slate-600 select-none"
              >
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[36px] px-2.5 py-2 rounded-lg text-xs font-mono font-semibold
                          border transition-all
                          ${
                            isActive
                              ? "bg-electric/15 border-electric text-electric shadow-neon"
                              : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/60 hover:text-white"
                          }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                     border border-dark-border text-slate-400
                     hover:border-electric/60 hover:text-electric
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:border-dark-border disabled:hover:text-slate-400
                     transition"
          aria-label="Следующая страница"
        >
          <span className="hidden sm:inline">Вперёд</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Быстрый переход по номеру страницы */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Страница</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          defaultValue={page}
          key={page}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= totalPages) onChange(v);
            }
          }}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 1 && v <= totalPages && v !== page) onChange(v);
          }}
          className="w-16 bg-dark-card border border-dark-border rounded-lg
                     px-2 py-1 text-center text-white font-mono text-xs
                     focus:border-electric transition"
        />
        <span>из {totalPages}</span>
      </div>
    </div>
  );
}

// Генерирует массив номеров страниц с ellipsis:
// [1, '...', 5, 6, 7, '...', 33]
function getPaginationRange(current, total) {
  const delta = 1; // сколько номеров показывать вокруг текущего
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
      if (i - prev === 2) {
        result.push(prev + 1);
      } else if (i - prev > 2) {
        result.push("...");
      }
    }
    result.push(i);
    prev = i;
  }

  return result;
}

// ============================================================
// Карточка юзера
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
      className={`card p-3 md:grid md:grid-cols-12 md:gap-3 md:items-center
                     ${isMe ? "border-electric/30" : ""}`}
    >
      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full overflow-hidden shrink-0
                        bg-gradient-to-br from-electric to-purple-600
                        flex items-center justify-center text-dark-bg font-bold text-xs
                        border border-dark-border"
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
          <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
            {u.full_name || u.name}
            {u.is_admin && (
              <Crown size={12} className="text-amber-400 shrink-0" />
            )}
            {isMe && (
              <span className="text-[9px] text-electric border border-electric/40 rounded px-1 shrink-0">
                вы
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500 truncate md:hidden">
            {u.email}
          </p>
        </div>
      </div>

      <div className="hidden md:block md:col-span-2 text-center">
        <p className="text-xs text-slate-300 truncate" title={u.email}>
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
          className={`text-[11px] px-2 py-1 rounded-full border transition-all
                      disabled:opacity-60 disabled:cursor-not-allowed
                      ${
                        u.is_admin
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "bg-dark-bg border-dark-border text-slate-500 hover:border-amber-500/40"
                      }`}
        >
          {u.is_admin ? "👑 Админ" : "Юзер"}
        </button>
      </div>

      <div className="hidden md:block md:col-span-1 text-center">
        <p className="text-sm font-mono text-white">{u.films_count}</p>
        <p className="text-[10px] text-slate-500">просм. {u.watched_count}</p>
      </div>

      <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap mt-3 md:mt-0 md:justify-end">
        <button
          onClick={onToggleVerify}
          disabled={busy}
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border
                      transition-all disabled:opacity-50
                      ${
                        u.email_verified
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
        >
          {u.email_verified ? <Mail size={12} /> : <MailX size={12} />}
          {u.email_verified ? "Подтв." : "Не подтв."}
        </button>

        {!u.email_verified && (
          <button
            onClick={onResend}
            disabled={busy}
            className="p-2 rounded-lg text-slate-400 hover:text-electric hover:bg-electric/10
                       transition disabled:opacity-50"
            title="Переотправить письмо"
          >
            <Mail size={14} />
          </button>
        )}

        <button
          onClick={onResetPassword}
          disabled={busy}
          className="p-2 rounded-lg text-slate-400 hover:text-electric hover:bg-electric/10
                     transition disabled:opacity-50"
          title="Сбросить пароль"
        >
          <KeyRound size={14} />
        </button>

        {!isMe && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10
                       transition disabled:opacity-50"
            title="Удалить"
          >
            <Trash2 size={14} />
          </button>
        )}

        {busy && <Loader2 size={14} className="text-electric animate-spin" />}
      </div>
    </div>
  );
}
