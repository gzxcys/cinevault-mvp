import { ExternalLink, Search } from "lucide-react";

// РФ-сервисы с шаблонами поиска.
// {q} = название фильма + год (URL-encoded)
const RU_SERVICES = [
  {
    id: "kinopoisk",
    name: "Кинопоиск",
    short: "КП",
    color: "bg-orange-500",
    url: (q) => `https://www.kinopoisk.ru/index.php?kp_query=${q}`,
    yandex: "kinopoisk.ru",
  },
  {
    id: "ivi",
    name: "Иви",
    short: "Иви",
    color: "bg-red-600",
    url: (q) => `https://www.ivi.ru/search/?q=${q}`,
    yandex: "ivi.ru",
  },
  {
    id: "okko",
    name: "Okko",
    short: "Okko",
    color: "bg-purple-600",
    url: (q) => `https://okko.tv/search/${q}`,
    yandex: "okko.tv",
  },
  {
    id: "premier",
    name: "Premier",
    short: "PREMIER",
    color: "bg-red-700",
    url: (q) => `https://premier.one/search?query=${q}`,
    yandex: "premier.one",
  },
  {
    id: "wink",
    name: "Wink",
    short: "Wink",
    color: "bg-pink-600",
    url: (q) => `https://wink.ru/search?query=${q}`,
    yandex: "wink.ru",
  },
  {
    id: "moretv",
    name: "More.tv",
    short: "More",
    color: "bg-indigo-600",
    url: (q) => `https://more.tv/search?query=${q}`,
    yandex: "more.tv",
  },
  {
    id: "start",
    name: "START",
    short: "START",
    color: "bg-yellow-500",
    url: (q) => `https://start.ru/search?query=${q}`,
    yandex: "start.ru",
  },
  {
    id: "youtube",
    name: "YouTube",
    short: "YT",
    color: "bg-red-600",
    url: (q) => `https://www.youtube.com/results?search_query=${q}`,
    yandex: "youtube.com",
  },
];

export default function WhereToWatch({ film }) {
  if (!film) return null;

  // Поисковый запрос: «Название Год» — точнее находит карточку
  const query = [film.title, film.year].filter(Boolean).join(" ");
  const encodedQuery = encodeURIComponent(query);

  return (
    <div
      className="px-4 md:px-6 py-4 border-t border-dark-border
                    pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-300">
          Где посмотреть в РФ
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Откроется поиск «{query}» в выбранном сервисе
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {RU_SERVICES.map((service) => (
          <div
            key={service.id}
            className="group relative flex items-center gap-2.5 p-2.5 rounded-xl
                       bg-dark-bg border border-dark-border
                       hover:border-electric/60 hover:shadow-neon
                       transition-all"
          >
            {/* Основная ссылка — поиск в сервисе */}
            <a
              href={service.url(encodedQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 flex-1 min-w-0 active:scale-[0.97] transition"
            >
              <div
                className={`${service.color} w-8 h-8 rounded-lg shrink-0
                              flex items-center justify-center
                              text-white font-bold text-[10px]
                              shadow-sm overflow-hidden`}
              >
                <span className="truncate px-0.5">{service.short}</span>
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span
                  className="text-xs font-medium text-white truncate
                                group-hover:text-electric transition"
                >
                  {service.name}
                </span>
                <ExternalLink
                  size={12}
                  className="text-slate-500 group-hover:text-electric
                            transition shrink-0"
                />
              </div>
            </a>

            {/* Маленькая иконка — поиск через Яндекс по сайту сервиса */}
            <a
              href={`https://yandex.ru/search/?text=${encodeURIComponent(`site:${service.yandex} ${query}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-slate-600 hover:text-electric
                         hover:bg-electric/10 transition shrink-0"
              title="Найти через Яндекс"
              aria-label={`Найти ${service.name} через Яндекс`}
            >
              <Search size={11} />
            </a>
          </div>
        ))}
      </div>

      {/* Большая кнопка на Кинопоиск */}
      <a
        href={RU_SERVICES[0].url(encodedQuery)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl
                   bg-orange-500/10 border border-orange-500/40
                   text-orange-300 hover:bg-orange-500/20 hover:border-orange-500
                   active:scale-[0.98] transition-all text-sm font-medium"
      >
        <span className="truncate">Найти «{film.title}» на Кинопоиске</span>
        <ExternalLink size={14} className="shrink-0" />
      </a>
    </div>
  );
}
