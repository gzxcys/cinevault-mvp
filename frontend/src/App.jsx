import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext.jsx";
import { getFilms, getStats } from "./services/api.js";
import MovieGrid from "./components/MovieGrid.jsx";
import CatalogTabs from "./components/CatalogTabs.jsx";
import SourceFilters from "./components/SourceFilters.jsx";
import GenreFilters from "./components/GenreFilters.jsx";
import RemindersBlock from "./components/RemindersBlock.jsx";
import AddMovieModal from "./components/AddMovieModal.jsx";
import MovieDetailModal from "./components/MovieDetailModal.jsx";
import RecommendationsView from "./components/RecommendationsView.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-3 border-electric/30 border-t-electric rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
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
  const [detailFilmId, setDetailFilmId] = useState(null);

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

  const displayName = user.full_name || user.name || user.email;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (tab === "profile") {
    return (
      <ProfilePage initialMode={profileMode} onBack={() => setTab("catalog")} />
    );
  }

  if (tab === "admin" && isAdmin) {
    return <AdminPage onBack={() => setTab("catalog")} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white flex">
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:h-screen border-r border-dark-border bg-dark-card/50 backdrop-blur">
        <div className="p-6">
          <h1 className="text-2xl font-bold">
            Cine<span className="text-electric">Vault</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Твоя видеоколлекция</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavItem
            icon={<Film size={20} />}
            label="Каталог"
            active={tab === "catalog"}
            onClick={() => setTab("catalog")}
          />
          <NavItem
            icon={<Sparkles size={20} />}
            label="Для тебя"
            active={tab === "recommendations"}
            onClick={() => setTab("recommendations")}
          />
          <NavItem
            icon={<BarChart3 size={20} />}
            label="Дашборд"
            active={tab === "dashboard"}
            onClick={() => setTab("dashboard")}
          />
          {isAdmin && (
            <NavItem
              icon={<Crown size={20} />}
              label="Админка"
              active={tab === "admin"}
              onClick={() => setTab("admin")}
            />
          )}
        </nav>

        <div className="p-4 space-y-2 border-t border-dark-border">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-electric w-full flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Добавить фильм
          </button>

          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-dark-bg border border-dark-border">
            <button
              onClick={() => goToProfile("view")}
              className="flex items-center gap-2 flex-1 min-w-0 group"
              title="Открыть профиль"
            >
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-electric to-purple-600
                              flex items-center justify-center text-dark-bg font-bold text-xs
                              shrink-0 overflow-hidden border-2 border-dark-border
                              group-hover:border-electric transition-all"
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
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-white truncate group-hover:text-electric transition flex items-center gap-1">
                  {user.full_name || user.name}
                  {isAdmin && (
                    <Crown size={10} className="text-amber-400 shrink-0" />
                  )}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            </button>

            <button
              onClick={() => goToProfile("edit")}
              className="p-1.5 rounded text-slate-500 hover:text-electric hover:bg-electric/10 transition shrink-0"
              title="Редактировать профиль"
            >
              <Pencil size={14} />
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 md:ml-64 pb-safe-mobile md:pb-0">
        <header className="md:hidden sticky top-0 z-20 bg-dark-bg/90 backdrop-blur border-b border-dark-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">
              Cine<span className="text-electric">Vault</span>
            </h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setTab("admin")}
                  className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"
                  aria-label="Админка"
                >
                  <Crown size={20} />
                </button>
              )}
              <button
                onClick={() => goToProfile("view")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-electric to-purple-600
                           flex items-center justify-center text-dark-bg font-bold text-xs
                           overflow-hidden border-2 border-dark-border active:scale-95 transition"
                aria-label="Профиль"
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
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="p-2 rounded-lg bg-electric text-dark-bg active:scale-95 transition"
                aria-label="Добавить фильм"
              >
                <Plus size={22} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 min-w-0">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && tab === "catalog" && (
            <CatalogView
              films={films}
              onFilmClick={(f) => setDetailFilmId(f.id)}
              request={catalogRequest}
            />
          )}
          {!loading && !error && tab === "recommendations" && (
            <RecommendationsView />
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-dark-card/95 backdrop-blur border-t border-dark-border">
        <div
          className="flex"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <BottomNavItem
            icon={<Film size={22} />}
            label="Каталог"
            active={tab === "catalog"}
            onClick={() => setTab("catalog")}
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

      <AddMovieModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
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
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-electric/10 text-electric border border-electric/30"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
        active ? "text-electric" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-2 border-electric/30 border-t-electric rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Загрузка коллекции...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card p-6 border-red-500/50 bg-red-500/5">
      <p className="text-red-400 font-semibold mb-1">Ошибка загрузки</p>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

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
      const q = search.toLowerCase().trim();
      const scored = [];
      for (const f of list) {
        let score = 0;
        const title = (f.title || "").toLowerCase();
        const original = (f.original_title || "").toLowerCase();
        const director = (f.director || "").toLowerCase();

        if (title === q) score += 100;
        else if (title.startsWith(q)) score += 50;
        else if (title.includes(q)) score += 30;

        if (original && original.includes(q)) score += 25;
        if (director && director.includes(q)) score += 20;
        if ((f.genres || []).some((g) => g.toLowerCase().includes(q)))
          score += 15;
        if ((f.tags || []).some((t) => t.toLowerCase().includes(q)))
          score += 10;

        if (score > 0) scored.push({ film: f, score });
      }
      scored.sort((a, b) => b.score - a.score);
      list = scored.map((s) => s.film);
    }

    return list;
  }, [filmsAfterSource, genreFilter, search]);

  const hasActiveFilter = sourceFilter || genreFilter || search.trim();

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-1">Каталог</h2>
        <p className="text-slate-400 text-sm">
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
          className="absolute left-4 top-1/2 -translate-y-1/2 text-electric pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название, режиссёр, жанр, тег..."
          className="w-full bg-dark-card border border-dark-border rounded-xl
                     pl-12 pr-12 py-3 text-white placeholder-slate-500
                     focus:border-electric focus:shadow-neon transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                       hover:text-electric transition p-1"
            aria-label="Очистить"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 font-medium mb-1">
            {search.trim() ? "Ничего не найдено" : "Здесь пока пусто"}
          </p>
          <p className="text-slate-500 text-sm">
            {search.trim()
              ? `По запросу «${search}» нет совпадений. Попробуй другое слово.`
              : tab === "favorites"
                ? "Добавляй фильмы в избранное, нажимая на сердечко"
                : tab === "watching"
                  ? "Отмечай фильмы и сериалы, которые смотришь прямо сейчас"
                  : tab === "watched"
                    ? "Фильмы со статусом «Просмотрено» появятся здесь"
                    : tab === "planned"
                      ? "Фильмы, которые ты хочешь посмотреть, появятся здесь"
                      : tab === "local"
                        ? "Добавь фильмы с локального диска или физического носителя"
                        : sourceFilter
                          ? "В этом источнике ничего нет"
                          : genreFilter
                            ? "В этом жанре ничего нет"
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

function DashboardView({ stats, onTileClick, onFilmClick }) {
  if (!stats) return <p className="text-slate-400">Статистика недоступна</p>;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-1">Дашборд</h2>
        <p className="text-slate-400 text-sm">Аналитика твоей коллекции</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
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
          <h3 className="font-semibold mb-4">Источники контента</h3>
          <div className="space-y-3">
            <SourceBar
              label="Стриминг"
              count={stats.bySource?.streaming || 0}
              total={stats.total}
              color="bg-purple-400"
            />
            <SourceBar
              label="Локальные файлы"
              count={stats.bySource?.local || 0}
              total={stats.total}
              color="bg-blue-400"
            />
            <SourceBar
              label="Физические носители"
              count={stats.bySource?.physical || 0}
              total={stats.total}
              color="bg-orange-400"
            />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Топ жанров</h3>
          <div className="space-y-2">
            {(stats.byGenre || []).slice(0, 5).map((g) => (
              <div key={g.genre} className="flex justify-between text-sm">
                <span className="text-slate-300">{g.genre}</span>
                <span className="text-electric font-mono">{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-2">Средний рейтинг</h3>
          <p className="text-4xl font-bold text-electric">
            {stats.avgRating || "—"}
            <span className="text-lg text-slate-500 ml-1">/ 5</span>
          </p>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Топ режиссёров</h3>
          <div className="space-y-2">
            {(stats.topDirectors || []).slice(0, 5).map((d, i) => (
              <div key={d.director} className="flex justify-between text-sm">
                <span className="text-slate-300">
                  <span className="text-slate-600 font-mono mr-2">
                    {i + 1}.
                  </span>
                  {d.director}
                </span>
                <span className="text-electric font-mono">{d.count}</span>
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
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all group w-full
                  hover:border-electric/60 hover:shadow-neon hover:-translate-y-0.5
                  active:scale-[0.98] cursor-pointer
                  ${accent ? "border-electric/40" : ""}`}
    >
      <p
        className="text-xs text-slate-400 uppercase tracking-wide mb-1
                    group-hover:text-slate-300 transition"
      >
        {label}
      </p>
      <p
        className={`text-2xl md:text-3xl font-bold ${accent ? "text-electric" : "text-white"}`}
      >
        {value}
      </p>
    </button>
  );
}

function SourceBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500">
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
