export default function CatalogTabs({ active, onChange, counts }) {
  const tabs = [
    { id: "all", label: "Все" },
    { id: "watched", label: "Просмотренные" },
    { id: "watching", label: "Смотрю" },
    { id: "planned", label: "В планах" },
    { id: "favorites", label: "Любимые" },
    { id: "local", label: "С носителей" },
  ];

  return (
    <div className="w-full mb-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const count = counts?.[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                          border transition-all active:scale-95 whitespace-nowrap
                          ${
                            isActive
                              ? "bg-electric/10 border-electric text-electric shadow-neon"
                              : "bg-dark-card border-dark-border text-slate-400 hover:border-electric/40 hover:text-white"
                          }`}
            >
              {tab.label}
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md min-w-[22px] text-center
                            ${
                              isActive
                                ? "bg-electric/20 text-electric"
                                : "bg-white/5 text-slate-500"
                            }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
