import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Plus,
  BarChart3,
  Search,
  Sparkles,
  LogOut,
  Pencil,
  X,
  Crown,
  Globe,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext.jsx";
import { getFilms, getStats } from "./services/api.js";
import { fuzzySearchFilms } from "./utils/fuzzySearch.js";
import MovieGrid from "./components/MovieGrid.jsx";
import CatalogTabs from "./components/CatalogTabs.jsx";
import SourceFilters from "./components/SourceFilters.jsx";
import GenreFilters from "./components/GenreFilters.jsx";
import RemindersBlock from "./components/RemindersBlock.jsx";
import AddMovieModal from "./components/AddMovieModal.jsx";
import MovieDetailModal from "./components/MovieDetailModal.jsx";
import RecommendationsView from "./components/RecommendationsView.jsx";
import GlobalCatalogView from "./components/GlobalCatalogView.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-blood-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blood-accent/30 border-t-blood-accent rounded-full animate-spin" />
          <p className="text-blood-muted text-sm font-mono uppercase tracking-wider">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return <MainApp user={user} onLogout={logout} />;
}

function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("catalog");
  const [profileMode, setProfileMode] = useState("view");
  const [catalogRequest, setCatalogRequest] = useState(null);

  const [films, setFilms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefillFilm, setPrefillFilm] = useState(null);
  const [detailFilmId, setDetailFilmId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isAdmin = Boolean(user?.is_admin);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFilms([]);
    setStats(null);
    setError(null);

    async function load() {
      try {
        const [filmsData, statsData] = await Promise.all([
          getFilms(),
          getStats(),
        ]);
        if (cancelled) return;
        setFilms(filmsData);
        setStats(statsData);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function reloadData() {
    try {
      const [filmsData, statsData] = await Promise.all([
        getFilms(),
        getStats(),
      ]);
      setFilms(filmsData);
      setStats(statsData);
    } catch (e) {
      setError(e.message);
    }
  }

  function goToCatalog(tabId) {
    setCatalogRequest({ tab: tabId, requestId: Date.now() });
    setTab("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToProfile(mode = "view") {
    setProfileMode(mode);
    setTab("profile");
    window.scrollTo({ top: 0 });
  }

  function openAddWithPrefill(film) {
    setPrefillFilm(film);
    setShowAddModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setPrefillFilm(null);
  }

  function handleLogout() {
    setShowLogoutConfirm(false);
    onLogout();
  }

  const displayName = user.full_name || user.name || user.email;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (tab === "profile") {
    return (
      <ProfilePage
        initialMode={profileMode}
        onBack={() => setTab("catalog")}
        onLogout={() => setShowLogoutConfirm(true)}
      />
    );
  }

  if (tab === "admin" && isAdmin) {
    return <AdminPage onBack={() => setTab("catalog")} />;
  }

  return (
    <div className="min-h-screen bg-blood-bg text-white">
      {/* ХЕДЕР */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md border-b border-blood-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Лого */}
          <button
            onClick={() => setTab("catalog")}
            className="flex items-center gap-2 group shrink-0"
          >
            <h1 className="title-display text-2xl md:text-3xl tracking-wider leading-none">
              CINE
              <span className="text-blood-accent relative">
                VAULT
                <span
                  className="absolute left-0 right-0 -bottom-1 h-[2px] bg-blood-accent
                                 shadow-glow-sm opacity-0 group-hover:opacity-100
                                 transition-opacity"
                />
              </span>
            </h1>
          </button>

          {/* Правая часть */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Add */}
            <motion.button
              onClick={() => {
                setPrefillFilm(null);
                setShowAddModal(true);
              }}
              className="btn-blood flex items-center gap-2 py-2 px-3 md:px-4 text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span className="hidden sm:inline">ДОБАВИТЬ</span>
            </motion.button>

            {/* Админка */}
            {isAdmin && (
              <motion.button
                onClick={() => setTab("admin")}
                className="p-2 rounded-sm border border-blood-border
                           text-blood-muted hover:text-blood-accent
                           hover:border-blood-accent hover:shadow-glow-sm
                           transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Админка"
              >
                <Crown size={20} />
              </motion.button>
            )}

            {/* Профиль */}
            <motion.button
              onClick={() => goToProfile("view")}
              className="relative group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Профиль"
            >
              <div
                className="w-10 h-10 rounded-sm overflow-hidden
                              bg-gradient-to-br from-blood-accent to-blood-dim
                              border border-blood-border
                              group-hover:border-blood-accent group-hover:shadow-glow
                              transition-all flex items-center justify-center
                              text-white font-bold text-sm"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {isAdmin && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full
                                 bg-blood-accent shadow-glow-sm border border-black"
                />
              )}
            </motion.button>

            {/* ВЫЙТИ */}
            <motion.button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-sm border border-blood-border
                         text-blood-muted hover:text-blood-glow
                         hover:border-blood-accent hover:shadow-glow-sm
                         transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Выйти из аккаунта"
            >
              <LogOut size={20} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* КОНТЕНТ */}
      <main className="pt-20 pb-28 min-w-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 min-w-0">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && tab === "catalog" && (
            <CatalogView
              films={films}
              onFilmClick={(f) => setDetailFilmId(f.id)}
              request={catalogRequest}
            />
          )}
          {!loading && !error && tab === "global" && (
            <GlobalCatalogView
              onOpenDetail={(id) => setDetailFilmId(id)}
              onAddToLibrary={openAddWithPrefill}
            />
          )}
          {!loading && !error && tab === "recommendations" && (
            <RecommendationsView onAddToLibrary={openAddWithPrefill} />
          )}
          {!loading && !error && tab === "dashboard" && (
            <DashboardView
              stats={stats}
              onTileClick={goToCatalog}
              onFilmClick={(f) => setDetailFilmId(f.id)}
            />
          )}
        </div>
      </main>

      {/* НИЖНЯЯ НАВИГАЦИЯ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30
                      bg-black/85 backdrop-blur-md border-t border-blood-border"
      >
        <div
          className="max-w-3xl mx-auto flex items-center justify-around px-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <BottomNavItem
            icon={<Film size={22} />}
            label="Коллекция"
            active={tab === "catalog"}
            onClick={() => setTab("catalog")}
          />
          <BottomNavItem
            icon={<Globe size={22} />}
            label="Каталог"
            active={tab === "global"}
            onClick={() => setTab("global")}
          />
          <BottomNavItem
            icon={<Sparkles size={22} />}
            label="Для тебя"
            active={tab === "recommendations"}
            onClick={() => setTab("recommendations")}
          />
          <BottomNavItem
            icon={<BarChart3 size={22} />}
            label="Дашборд"
            active={tab === "dashboard"}
            onClick={() => setTab("dashboard")}
          />
        </div>
      </nav>

      {/* Модалки */}
      <AddMovieModal
        open={showAddModal}
        onClose={closeAddModal}
        prefillFilm={prefillFilm}
        onAdded={(film) => {
          setFilms((prev) => [film, ...prev]);
          reloadData();
        }}
      />

      <MovieDetailModal
        filmId={detailFilmId}
        open={detailFilmId !== null}
        onClose={() => setDetailFilmId(null)}
        onUpdated={() => reloadData()}
        onDeleted={(deletedId) => {
          setFilms((prev) => prev.filter((f) => f.id !== deletedId));
          reloadData();
        }}
      />

      {/* Подтверждение выхода */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm
                       flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              className="bg-blood-card rounded-sm p-6 max-w-sm w-full
                         border border-blood-accent/50 relative"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blood-accent shadow-glow" />

              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-sm bg-blood-accent/10
                                border-2 border-blood-accent/40
                                flex items-center justify-center"
                >
                  <LogOut size={32} className="text-blood-glow" />
                </div>
              </div>

              <h3 className="title-display text-2xl text-blood-glow mb-2 text-center">
                ВЫЙТИ ИЗ АККАУНТА?
              </h3>
              <p className="text-sm text-blood-muted mb-5 text-center">
                Ты выйдешь из аккаунта{" "}
                <span className="text-white font-mono">{user.email}</span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-ghost flex-1 py-2.5 text-sm"
                >
                  ОТМЕНА
                </button>
                <motion.button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-sm bg-blood-accent text-white
                             flex items-center justify-center gap-2
                             hover:bg-blood-glow shadow-glow"
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    letterSpacing: "0.06em",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <LogOut size={16} />
                  ВЫЙТИ
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Нижняя навигация
// ============================================================
function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center gap-1 py-3
                  transition-colors duration-200 active:scale-95`}
    >
      {active && (
        <motion.span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px]
                     bg-blood-accent rounded-b"
          style={{ boxShadow: "0 0 12px rgba(229,9,20,0.9)" }}
          layoutId="bottom-nav-indicator"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span
        className={`transition-colors ${active ? "text-blood-accent" : "text-blood-muted"}`}
      >
        {icon}
      </span>
      <span
        className={`text-[10px] font-bold uppercase tracking-wider
                    transition-colors ${active ? "text-blood-accent" : "text-blood-muted"}`}
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-2 border-blood-accent/30 border-t-blood-accent rounded-full animate-spin" />
      <p className="text-blood-muted text-sm font-mono uppercase tracking-wider">
        Загрузка...
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card p-6 border-blood-accent/50 bg-blood-accent/5">
      <p
        className="text-blood-glow font-bold uppercase tracking-wider mb-1"
        style={{ fontFamily: "Bebas Neue, sans-serif" }}
      >
        Ошибка загрузки
      </p>
      <p className="text-blood-muted text-sm">{message}</p>
    </div>
  );
}

// ============================================================
// CatalogView
// ============================================================
function CatalogView({ films, onFilmClick, request }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sourceFilter, setSourceFilter] = useState(null);
  const [genreFilter, setGenreFilter] = useState(null);

  useEffect(() => {
    if (request?.tab) {
      setTab(request.tab);
      setSearch("");
      setSourceFilter(null);
      setGenreFilter(null);
    }
  }, [request]);

  const filmsAfterTab = useMemo(() => {
    switch (tab) {
      case "watched":
        return films.filter((f) => f.status === "watched");
      case "watching":
        return films.filter((f) => f.status === "watching");
      case "planned":
        return films.filter((f) => f.status === "planned");
      case "favorites":
        return films.filter((f) => f.is_favorite);
      case "local":
        return films.filter(
          (f) => f.source_type === "local" || f.source_type === "physical",
        );
      default:
        return films;
    }
  }, [films, tab]);

  const tabCounts = useMemo(
    () => ({
      all: films.length,
      watched: films.filter((f) => f.status === "watched").length,
      watching: films.filter((f) => f.status === "watching").length,
      planned: films.filter((f) => f.status === "planned").length,
      favorites: films.filter((f) => f.is_favorite).length,
      local: films.filter(
        (f) => f.source_type === "local" || f.source_type === "physical",
      ).length,
    }),
    [films],
  );

  const sourceCounts = useMemo(
    () => ({
      streaming: filmsAfterTab.filter((f) => f.source_type === "streaming")
        .length,
      local: filmsAfterTab.filter((f) => f.source_type === "local").length,
      physical: filmsAfterTab.filter((f) => f.source_type === "physical")
        .length,
    }),
    [filmsAfterTab],
  );

  const filmsAfterSource = useMemo(() => {
    return sourceFilter
      ? filmsAfterTab.filter((f) => f.source_type === sourceFilter)
      : filmsAfterTab;
  }, [filmsAfterTab, sourceFilter]);

  const topGenres = useMemo(() => {
    const map = {};
    for (const f of filmsAfterSource) {
      for (const g of f.genres || []) {
        map[g] = (map[g] || 0) + 1;
      }
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filmsAfterSource]);

  const filtered = useMemo(() => {
    let list = filmsAfterSource;

    if (genreFilter) {
      list = list.filter((f) => (f.genres || []).includes(genreFilter));
    }

    if (search.trim()) {
      list = fuzzySearchFilms(list, search.trim());
    }

    return list;
  }, [filmsAfterSource, genreFilter, search]);

  const hasActiveFilter = sourceFilter || genreFilter || search.trim();

  return (
    <>
      <div className="mb-6 accent-line">
        <h2 className="title-display text-4xl md:text-5xl text-white mb-1">
          МОЯ КОЛЛЕКЦИЯ
        </h2>
        <p className="text-blood-muted text-sm font-mono uppercase tracking-wider mt-3">
          {filtered.length} {filtered.length === 1 ? "позиция" : "позиций"}
          {hasActiveFilter && ` из ${films.length}`}
          {search.trim() && ` · по запросу «${search}»`}
        </p>
      </div>

      <CatalogTabs active={tab} onChange={setTab} counts={tabCounts} />
      <SourceFilters
        value={sourceFilter}
        onChange={setSourceFilter}
        counts={sourceCounts}
      />
      <GenreFilters
        topGenres={topGenres}
        value={genreFilter}
        onChange={setGenreFilter}
      />

      <div className="relative mb-6">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-accent pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название, режиссёр, жанр, тег..."
          className="w-full bg-blood-card border border-blood-border rounded-sm
                     pl-12 pr-12 py-3 text-white placeholder-blood-muted/60 text-sm
                     focus:border-blood-accent focus:shadow-glow-sm transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-blood-muted
                       hover:text-blood-accent transition p-1"
            aria-label="Очистить"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p
            className="text-blood-muted font-bold uppercase tracking-wider mb-1 text-lg"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            {search.trim() ? "Ничего не найдено" : "Здесь пока пусто"}
          </p>
          <p className="text-blood-muted/70 text-sm max-w-md mx-auto">
            {search.trim()
              ? `По запросу «${search}» нет совпадений.`
              : "Попробуй изменить запрос или добавь новый фильм"}
          </p>
        </div>
      ) : (
        <MovieGrid
          films={filtered}
          onFilmClick={onFilmClick}
          highlightQuery={search.trim()}
        />
      )}
    </>
  );
}

// ============================================================
// DashboardView
// ============================================================
function DashboardView({ stats, onTileClick, onFilmClick }) {
  if (!stats) return <p className="text-blood-muted">Статистика недоступна</p>;

  return (
    <>
      <div className="mb-6 accent-line">
        <h2 className="title-display text-4xl md:text-5xl text-white mb-1">
          ДАШБОРД
        </h2>
        <p className="text-blood-muted text-sm font-mono uppercase tracking-wider mt-3">
          Аналитика твоей коллекции
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Всего"
          value={stats.total}
          accent
          onClick={() => onTileClick("all")}
        />
        <StatCard
          label="Просмотрено"
          value={stats.byStatus?.watched || 0}
          onClick={() => onTileClick("watched")}
        />
        <StatCard
          label="В процессе"
          value={stats.byStatus?.watching || 0}
          onClick={() => onTileClick("watching")}
        />
        <StatCard
          label="В планах"
          value={stats.byStatus?.planned || 0}
          onClick={() => onTileClick("planned")}
        />
      </div>

      {stats.reminders && (
        <div className="mb-6">
          <RemindersBlock
            reminders={stats.reminders}
            onFilmClick={(item) => onFilmClick?.({ id: item.id })}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3
            className="text-lg text-white mb-4 uppercase tracking-wider"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Источники контента
          </h3>
          <div className="space-y-3">
            <SourceBar
              label="Стриминг"
              count={stats.bySource?.streaming || 0}
              total={stats.total}
              color="bg-blood-accent"
            />
            <SourceBar
              label="Локальные файлы"
              count={stats.bySource?.local || 0}
              total={stats.total}
              color="bg-blue-500"
            />
            <SourceBar
              label="Физические носители"
              count={stats.bySource?.physical || 0}
              total={stats.total}
              color="bg-amber-500"
            />
          </div>
        </div>

        <div className="card p-5">
          <h3
            className="text-lg text-white mb-4 uppercase tracking-wider"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Топ жанров
          </h3>
          <div className="space-y-2">
            {(stats.byGenre || []).slice(0, 5).map((g) => (
              <div key={g.genre} className="flex justify-between text-sm">
                <span className="text-blood-muted">{g.genre}</span>
                <span className="text-blood-accent num-mono font-bold">
                  {g.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3
            className="text-lg text-white mb-3 uppercase tracking-wider"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Средний рейтинг
          </h3>
          <p className="text-5xl font-bold text-blood-accent num-mono">
            {stats.avgRating || "—"}
            <span className="text-xl text-blood-muted ml-1">/10</span>
          </p>
        </div>

        <div className="card p-5">
          <h3
            className="text-lg text-white mb-4 uppercase tracking-wider"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Топ режиссёров
          </h3>
          <div className="space-y-2">
            {(stats.topDirectors || []).slice(0, 5).map((d, i) => (
              <div key={d.director} className="flex justify-between text-sm">
                <span className="text-blood-muted">
                  <span className="text-blood-muted/50 num-mono mr-2">
                    {i + 1}.
                  </span>
                  {d.director}
                </span>
                <span className="text-blood-accent num-mono font-bold">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, accent, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative bg-blood-card p-4 text-left transition-all group w-full
                  rounded-sm border border-blood-border overflow-hidden
                  hover:border-blood-accent hover:shadow-glow
                  ${accent ? "border-blood-accent/60" : ""}`}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <span
        className="absolute top-0 left-0 right-0 h-[2px] bg-blood-accent
                       scale-x-0 group-hover:scale-x-100 transition-transform
                       duration-300 origin-left shadow-glow"
      />

      <p className="text-[10px] text-blood-muted uppercase tracking-[0.15em] mb-2 font-mono">
        {label}
      </p>
      <p
        className={`text-4xl font-bold num-mono ${accent ? "text-blood-accent" : "text-white"}`}
      >
        {value}
      </p>
    </motion.button>
  );
}

function SourceBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-blood-muted uppercase tracking-wider font-mono">
          {label}
        </span>
        <span className="text-white num-mono font-bold">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1 bg-blood-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ boxShadow: "0 0 8px currentColor" }}
        />
      </div>
    </div>
  );
}
