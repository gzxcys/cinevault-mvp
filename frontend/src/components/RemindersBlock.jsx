import { Tv, Clock, Bookmark, Heart, AlertCircle } from "lucide-react";

function formatDays(days) {
  if (!days || days < 1) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 5) return `${days} дня назад`;
  if (days < 21) return `${days} дней назад`;
  if (days < 31) return "больше 3 недель назад";
  if (days < 60) return "больше месяца назад";
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
  return `${Math.floor(days / 365)} г. назад`;
}

export default function RemindersBlock({ reminders, onFilmClick }) {
  if (!reminders) return null;

  const {
    unfinishedSeries = [],
    unfinishedMovies = [],
    forgottenPlans = [],
    rewatchSuggestions = [],
    totalCount = 0,
  } = reminders;

  if (totalCount === 0) {
    return (
      <div className="card p-5 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30
                          flex items-center justify-center shrink-0"
          >
            <Heart size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-emerald-300">
              Всё под контролем
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Нет недосмотренного и забытого. Продолжай в том же духе!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: "series",
      icon: Tv,
      title: "Продолжить сериал",
      subtitle: "Ты не досмотрел",
      items: unfinishedSeries,
      color: "text-electric",
      bgColor: "bg-electric/5",
    },
    {
      id: "movies",
      icon: Clock,
      title: "Досмотреть фильм",
      subtitle: "Начал, но не закончил",
      items: unfinishedMovies,
      color: "text-purple-300",
      bgColor: "bg-purple-500/5",
    },
    {
      id: "plans",
      icon: Bookmark,
      title: "Забытые планы",
      subtitle: "Хотел посмотреть давно",
      items: forgottenPlans,
      color: "text-amber-300",
      bgColor: "bg-amber-500/5",
    },
    {
      id: "rewatch",
      icon: Heart,
      title: "Пересмотреть",
      subtitle: "Твои любимые, давно не видел",
      items: rewatchSuggestions,
      color: "text-red-400",
      bgColor: "bg-red-500/5",
    },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-dark-border flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full bg-electric/10 border border-electric/30
                        flex items-center justify-center shrink-0"
        >
          <AlertCircle size={18} className="text-electric" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">Напоминания</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalCount} {totalCount === 1 ? "вещь ждёт" : "вещей ждут"} твоего
            внимания
          </p>
        </div>
      </div>

      <div className="divide-y divide-dark-border">
        {sections.map((section) => (
          <ReminderSection
            key={section.id}
            section={section}
            onFilmClick={onFilmClick}
          />
        ))}
      </div>
    </div>
  );
}

function ReminderSection({ section, onFilmClick }) {
  const { icon: Icon, title, subtitle, items, color, bgColor } = section;

  return (
    <div className={`p-4 md:p-5 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${color}`}>{title}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs text-slate-500 font-mono">{items.length}</span>
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onFilmClick?.(item)}
              className="group w-28 shrink-0 rounded-lg overflow-hidden
                         bg-dark-card border border-dark-border
                         hover:border-electric/60 hover:shadow-neon
                         active:scale-[0.97] transition-all text-left"
            >
              <div className="w-full aspect-[2/3] bg-slate-800 relative overflow-hidden">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-1">
                    <span className="text-white/70 font-bold text-[10px] text-center line-clamp-3">
                      {item.title}
                    </span>
                  </div>
                )}

                {typeof item.days_since === "number" && (
                  <div
                    className="absolute bottom-1 left-1 right-1
                                  bg-black/70 backdrop-blur rounded
                                  px-1.5 py-0.5 text-[9px] text-white/90
                                  flex items-center justify-center gap-1"
                  >
                    <Clock size={8} />
                    {formatDays(item.days_since)}
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight">
                  {item.title}
                </p>
                {item.year && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {item.year}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
