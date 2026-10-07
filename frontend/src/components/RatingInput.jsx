import { Star } from "lucide-react";

/**
 * Компонент ввода оценки от 1 до 10.
 *
 * Использование:
 *   <RatingInput value={rating} onChange={setRating} />
 *   <RatingInput value={rating} onChange={setRating} disabled />
 *
 * value: 0-10 (0 = оценка не поставлена)
 * onChange(newValue): получает число 1-10 (или 0 если сняли оценку)
 */
export default function RatingInput({
  value = 0,
  onChange,
  disabled = false,
  size = "md",
}) {
  const sizes = {
    sm: { button: "w-7 h-7 text-[10px]", gap: "gap-1" },
    md: { button: "w-9 h-9 text-xs", gap: "gap-1.5" },
    lg: { button: "w-10 h-10 text-sm", gap: "gap-2" },
  };
  const s = sizes[size] || sizes.md;

  // Цвет по значению: 1-3 красный, 4-6 оранжевый, 7-8 жёлтый, 9-10 зелёный
  function colorFor(n) {
    if (n <= 3) return "text-red-400 border-red-500/50 bg-red-500/15";
    if (n <= 6) return "text-orange-400 border-orange-500/50 bg-orange-500/15";
    if (n <= 8) return "text-amber-400 border-amber-500/50 bg-amber-500/15";
    return "text-emerald-400 border-emerald-500/50 bg-emerald-500/15";
  }

  return (
    <div className={`flex items-center ${s.gap} flex-wrap`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = n <= value;
        const isCurrent = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => !disabled && onChange?.(n === value ? 0 : n)}
            disabled={disabled}
            title={`Оценка ${n}/10`}
            className={`${s.button} rounded-lg font-bold transition-all
                        flex items-center justify-center border
                        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          active
                            ? colorFor(n) +
                              (isCurrent ? " shadow-neon scale-110" : "")
                            : "border-dark-border text-slate-500 hover:border-electric/50 hover:text-electric"
                        }`}
          >
            {n}
          </button>
        );
      })}
      {value > 0 && (
        <span
          className={`ml-2 text-sm font-mono font-semibold ${colorFor(value).split(" ")[0]}`}
        >
          {value}/10
        </span>
      )}
    </div>
  );
}
