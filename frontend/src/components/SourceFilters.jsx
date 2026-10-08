import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronDown, Check } from "lucide-react";
import { SOURCES_LIST } from "../utils/sources.js";

export default function SourceFilters({ value, onChange, counts = {} }) {
  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const ref = useRef(null);

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  const isOpen = open || hoverOpen;

  const currentLabel = value
    ? SOURCES_LIST.find((s) => s.value === value)?.short || "Источник"
    : "Все источники";

  const currentCount = value ? counts[value] || 0 : total;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const options = [
    {
      value: null,
      label: "Все источники",
      count: total,
      icon: null,
      short: "Все",
    },
    ...SOURCES_LIST.map((s) => ({
      value: s.value,
      label: s.label,
      count: counts[s.value] || 0,
      icon: s.icon,
      short: s.short,
    })),
  ];

  return (
    <div
      className="relative w-max mb-4"
      ref={ref}
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm
                    border transition-all duration-200 min-w-[180px]
                    ${
                      isOpen
                        ? "border-blood-accent bg-blood-accent/10 text-blood-glow shadow-glow-sm"
                        : "border-blood-border text-blood-muted hover:border-blood-accent/60 hover:text-white"
                    }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Layers size={14} className="shrink-0" />
          <span
            className="hidden md:inline text-[10px] text-blood-muted/70
                           uppercase tracking-wider font-mono shrink-0"
          >
            Источник:
          </span>
          <span
            className="text-xs font-bold uppercase tracking-wider truncate"
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              letterSpacing: "0.06em",
            }}
          >
            {currentLabel}
          </span>
          {currentCount > 0 && (
            <span
              className="text-[10px] font-mono px-1 rounded-sm shrink-0
                             bg-blood-accent text-white"
            >
              {currentCount}
            </span>
          )}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 z-40 w-64
                       bg-black/95 backdrop-blur-md border border-blood-accent/40
                       rounded-sm shadow-glow-lg overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r
                            from-transparent via-blood-accent to-transparent"
            />

            <div className="p-1.5">
              {options.map((opt, i) => {
                const Icon = opt.icon;
                const isActive = value === opt.value;
                const disabled = opt.count === 0 && opt.value !== null;

                return (
                  <motion.button
                    key={opt.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.15 }}
                    onClick={() => {
                      if (disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                      setHoverOpen(false);
                    }}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm
                                transition-all duration-150 text-left
                                disabled:opacity-30 disabled:cursor-not-allowed
                                ${
                                  isActive
                                    ? "bg-blood-accent/15 text-blood-glow"
                                    : "text-blood-muted hover:bg-blood-accent/10 hover:text-white"
                                }`}
                    whileHover={{ x: 3 }}
                  >
                    {Icon && <Icon size={14} className="shrink-0" />}
                    <span
                      className="flex-1 text-xs font-bold uppercase tracking-wider truncate"
                      style={{
                        fontFamily: "Bebas Neue, sans-serif",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded-sm shrink-0
                                      ${
                                        isActive
                                          ? "bg-blood-accent text-white"
                                          : "bg-blood-card text-blood-muted border border-blood-border"
                                      }`}
                    >
                      {opt.count}
                    </span>
                    {isActive && (
                      <Check size={12} className="text-blood-accent shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
