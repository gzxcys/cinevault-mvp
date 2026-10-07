import MovieCard from "./MovieCard.jsx";
import { Film } from "lucide-react";

export default function MovieGrid({ films, onFilmClick, highlightQuery }) {
  if (films.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Film size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 font-medium">Ничего не найдено</p>
        <p className="text-slate-500 text-sm mt-1">
          Попробуй изменить запрос или добавить новый фильм
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {films.map((film) => (
        <MovieCard
          key={film.id}
          film={film}
          onClick={onFilmClick}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  );
}
