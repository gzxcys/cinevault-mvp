import { Tv, HardDrive, Disc } from "lucide-react";

/**
 * Единый конфиг источников контента.
 * Используется в MovieCard, MovieDetailModal, AddMovieModal, фильтрах.
 */
export const SOURCES = {
  streaming: {
    value: "streaming",
    label: "Стриминг",
    short: "Стриминг",
    icon: Tv,
    // Цвета для бейджей
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    // Цвет для прогресс-баров / точек
    dot: "bg-purple-400",
    // Плейсхолдер в форме добавления
    placeholder: "Netflix, Кинопоиск, Okko, Disney+...",
  },
  local: {
    value: "local",
    label: "Локальный файл",
    short: "Локально",
    icon: HardDrive,
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    dot: "bg-blue-400",
    placeholder: "/Movies/Inception.2010.1080p.mkv",
  },
  physical: {
    value: "physical",
    label: "Физический носитель",
    short: "Носитель",
    icon: Disc,
    color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    dot: "bg-orange-400",
    placeholder: "DVD, Blu-ray, VHS, кассета...",
  },
};

// Массив для итерации (для форм, фильтров и т.д.)
export const SOURCES_LIST = Object.values(SOURCES);

// Хелпер — получить конфиг источника по ключу с fallback
export function getSource(type) {
  return SOURCES[type] || SOURCES.streaming;
}

/**
 * Обрезает длинный путь к файлу для компактного отображения.
 * /Movies/Subfolder/Inception.2010.mkv → Inception.2010.mkv
 */
export function shortSourceName(name) {
  if (!name) return null;
  // Если путь содержит / — берём только последний сегмент
  if (name.includes("/")) {
    const parts = name.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return name;
}
