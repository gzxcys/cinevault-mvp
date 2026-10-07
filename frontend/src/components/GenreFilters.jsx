import { Tag } from "lucide-react";

export default function GenreFilters({ topGenres = [], value, onChange }) {
  if (topGenres.length === 0) return null;

  return (
    <div className="w-full mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 min-w-max">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pr-1 shrink-0">
          <Tag size={14} />
          Жанр:
        </div>

        <Chip active={value === null} onClick={() => onChange(null)}>
          Все
        </Chip>

        {topGenres.map(({ name, count }) => {
          const isActive = value === name;
          return (
            <Chip
              key={name}
              active={isActive}
              onClick={() => onChange(isActive ? null : name)}
              count={count}
            >
              {name}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  text-xs font-medium border transition-all active:scale-95
                  whitespace-nowrap max-w-[180px]
                  ${
                    active
                      ? "bg-electric/15 border-electric text-electric shadow-neon"
                      : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                  }`}
      title={typeof children === "string" ? children : undefined}
    >
      <span className="truncate">{children}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`text-[10px] font-mono px-1 rounded shrink-0
                          ${active ? "bg-electric/20 text-electric" : "bg-white/5 text-slate-500"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
