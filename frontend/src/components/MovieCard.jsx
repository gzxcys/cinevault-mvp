import { Play, Check, Bookmark, Star } from "lucide-react";
import { getSource, shortSourceName } from "../utils/sources.js";

const GRADIENTS = [
  "from-blue-600 to-purple-700",
  "from-electric to-blue-600",
  "from-purple-600 to-pink-600",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-700",
  "from-fuchsia-600 to-purple-800",
  "from-amber-500 to-orange-700",
];

function gradientFor(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const STATUS = {
  watched: {
    label: "Просмотрено",
    icon: Check,
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  watching: {
    label: "Смотрю",
    icon: Play,
    color: "bg-electric/20 text-electric border-electric/40",
  },
  planned: {
    label: "В планах",
    icon: Bookmark,
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
};

// Подсвечивает все вхождения query в text (регистронезависимо)
function Highlight({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>;
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery);

  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(
      <mark
        key={`${idx}-${parts.length}`}
        className="bg-electric/30 text-electric rounded px-0.5"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    lastIndex = idx + q.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

export default function MovieCard({ film, onClick, highlightQuery }) {
  const status = STATUS[film.status] || STATUS.planned;
  const StatusIcon = status.icon;
  const hasPoster = film.poster_url && film.poster_url.startsWith("http");

  const source = getSource(film.source_type);
  const SourceIcon = source.icon;
  const sourceDisplay = shortSourceName(film.source_name);

  return (
    <button
      onClick={() => onClick?.(film)}
      className="card overflow-hidden text-left group
                 hover:shadow-neon hover:-translate-y-1 transition-all duration-200
                 active:scale-[0.98]"
    >
      {/* Постер */}
      <div className="relative w-full aspect-[2/3] overflow-hidden">
        {hasPoster && (
          <img
            src={film.poster_url}
            alt={film.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}

        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradientFor(film.title)}
                      flex items-center justify-center p-4
                      ${hasPoster ? "hidden" : "flex"}`}
        >
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-tight line-clamp-3 drop-shadow-lg">
              <Highlight text={film.title} query={highlightQuery} />
            </p>
            {film.year && (
              <p className="text-white/70 text-sm mt-2 font-mono">
                {film.year}
              </p>
            )}
          </div>
        </div>

        {film.user_rating && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1
                          bg-black/60 backdrop-blur rounded-full px-2 py-1
                          text-xs font-semibold text-amber-300 border border-amber-500/30"
          >
            <Star size={12} fill="currentColor" />
            {film.user_rating}
          </div>
        )}

        {film.type === "series" && (
          <div
            className="absolute top-2 right-2 bg-black/60 backdrop-blur
                          rounded-full px-2 py-1 text-[10px] font-medium text-white/90
                          border border-white/10"
          >
            Сериал
          </div>
        )}

        {sourceDisplay && (
          <div
            className="absolute bottom-0 left-0 right-0 p-2
                          bg-gradient-to-t from-black/90 to-transparent
                          pt-6"
          >
            <div
              className={`inline-flex items-center gap-1.5 max-w-full
                             text-[10px] font-medium px-2 py-0.5 rounded-md
                             backdrop-blur border ${source.color}`}
            >
              <SourceIcon size={10} className="shrink-0" />
              <span className="truncate">{sourceDisplay}</span>
            </div>
          </div>
        )}
      </div>

      {/* Нижняя часть */}
      <div className="p-3 space-y-2">
        <div>
          <p className="font-semibold text-sm text-white line-clamp-1">
            <Highlight text={film.title} query={highlightQuery} />
          </p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            <Highlight text={film.director || "—"} query={highlightQuery} />
            {film.year ? ` · ${film.year}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium
                            px-2 py-0.5 rounded-full border ${status.color}`}
          >
            <StatusIcon size={10} />
            {status.label}
          </span>

          {!sourceDisplay && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium
                              px-2 py-0.5 rounded-full border ${source.color}`}
            >
              <SourceIcon size={10} />
              {source.short}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
