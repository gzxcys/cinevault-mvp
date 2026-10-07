import { useState, useEffect } from "react";
import { Sparkles, Loader2, Film, Users, Tag, TrendingUp } from "lucide-react";
import { getRecommendations } from "../services/api.js";

export default function RecommendationsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecommendations(20)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-electric animate-spin" />
        <p className="text-slate-400 text-sm">Подбираю рекомендации...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 border-red-500/50 bg-red-500/5">
        <p className="text-red-400 font-semibold mb-1">Ошибка</p>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  const { basedOn, recommendations } = data || {};

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
          <Sparkles size={28} className="text-electric" />
          Для тебя
        </h2>
        <p className="text-slate-400 text-sm">
          Подобрано на основе твоих оценок и вкусов похожих пользователей
        </p>
      </div>

      {/* Блок «На основе чего» */}
      {basedOn && (
        <div className="card p-4 mb-6 bg-gradient-to-br from-electric/5 to-purple-600/5 border-electric/20">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">
            На основе
          </p>
          <div className="flex flex-wrap gap-2">
            {basedOn.favoriteGenres?.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 text-xs
                           bg-electric/10 text-electric border border-electric/30
                           rounded-full px-2.5 py-1"
              >
                <Tag size={10} />
                {g}
              </span>
            ))}
            {basedOn.favoriteDirectors?.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 text-xs
                           bg-purple-500/10 text-purple-300 border border-purple-500/30
                           rounded-full px-2.5 py-1"
              >
                🎬 {d}
              </span>
            ))}
          </div>
          {basedOn.similarUsersCount > 0 && (
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Users size={12} />
              Нашли {basedOn.similarUsersCount}{" "}
              {basedOn.similarUsersCount === 1
                ? "похожего пользователя"
                : "похожих пользователей"}{" "}
              с общими фильмами
            </p>
          )}
        </div>
      )}

      {/* Список рекомендаций */}
      {!recommendations || recommendations.length === 0 ? (
        <div className="text-center py-16">
          <Film size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">
            Пока нечего рекомендовать
          </p>
          <p className="text-slate-500 text-sm">
            Оцени больше фильмов — алгоритм подберёт рекомендации
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </>
  );
}

function RecommendationCard({ rec }) {
  const hasPoster = rec.poster_url && rec.poster_url.startsWith("http");

  // Иконка и цвет источника рекомендации
  const sourceMeta = {
    hybrid: {
      icon: Sparkles,
      label: "Совпадение",
      color: "text-electric bg-electric/10 border-electric/40",
    },
    collaborative: {
      icon: Users,
      label: "Советуют",
      color: "text-purple-300 bg-purple-500/10 border-purple-500/40",
    },
    content: {
      icon: TrendingUp,
      label: "Похожее",
      color: "text-blue-300 bg-blue-500/10 border-blue-500/40",
    },
  }[rec.source] || {
    icon: Sparkles,
    label: "Рекомендация",
    color: "text-electric bg-electric/10 border-electric/40",
  };
  const SourceIcon = sourceMeta.icon;

  return (
    <div className="card overflow-hidden group hover:shadow-neon hover:-translate-y-1 transition-all duration-200">
      {/* Постер */}
      <div className="relative w-full aspect-[2/3] overflow-hidden">
        {hasPoster ? (
          <img
            src={rec.poster_url}
            alt={rec.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-electric/30 to-purple-600/30
                          flex items-center justify-center p-3"
          >
            <span className="text-white font-bold text-sm text-center line-clamp-3">
              {rec.title}
            </span>
          </div>
        )}

        {/* Плашка «почему рекомендуем» */}
        <div
          className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full
                         text-[10px] font-medium border backdrop-blur ${sourceMeta.color}`}
        >
          <SourceIcon size={10} />
          {sourceMeta.label}
        </div>
      </div>

      {/* Инфа */}
      <div className="p-3">
        <p className="font-semibold text-sm text-white line-clamp-1">
          {rec.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
          {rec.director || "—"}
          {rec.year ? ` · ${rec.year}` : ""}
        </p>
        <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 italic">
          {rec.reason}
        </p>
      </div>
    </div>
  );
}
