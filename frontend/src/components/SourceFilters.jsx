import { Layers } from "lucide-react";
import { SOURCES_LIST } from "../utils/sources.js";

export default function SourceFilters({ value, onChange, counts = {} }) {
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <div className="w-full mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 min-w-max">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pr-1 shrink-0">
          <Layers size={14} />
          Источник:
        </div>

        <FilterChip
          active={value === null}
          onClick={() => onChange(null)}
          color="bg-white/10 text-white border-white/20"
          count={total}
        >
          Все
        </FilterChip>

        {SOURCES_LIST.map((source) => {
          const Icon = source.icon;
          const isActive = value === source.value;
          const count = counts[source.value] || 0;

          return (
            <FilterChip
              key={source.value}
              active={isActive}
              onClick={() => onChange(isActive ? null : source.value)}
              color={source.color}
              icon={<Icon size={12} />}
              count={count}
              disabled={count === 0}
            >
              {source.short}
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  icon,
  count,
  disabled,
  children,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  text-xs font-medium border transition-all active:scale-95
                  whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed
                  ${
                    active
                      ? `${color} shadow-neon`
                      : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                  }`}
    >
      {icon}
      <span>{children}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`text-[10px] font-mono px-1 rounded
                          ${active ? "bg-black/20" : "bg-white/5 text-slate-500"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
