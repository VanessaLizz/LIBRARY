import { Link } from 'react-router-dom';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Book } from '@/lib/types';

// Mapeamento de cores dos indicadores em bolinha (status)
const statusColors: Record<string, string> = {
  'Quero Ler': 'bg-amber-500',
  'quero ler': 'bg-amber-500',
  'Lendo': 'bg-blue-500',
  'lendo': 'bg-blue-500',
  'Pausado': 'bg-orange-500',
  'pausado': 'bg-orange-500',
  'Abandonado': 'bg-rose-500',
  'abandonado': 'bg-rose-500',
  'Relendo': 'bg-purple-500',
  'relido': 'bg-purple-500',
  'Concluído': 'bg-emerald-500',
  'Lido': 'bg-emerald-500',
  'lido': 'bg-emerald-500',
};

interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (id: string) => void;
}

export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  // Trata formato de autores vindo do Supabase/Bolt
  const renderAuthor = () => {
    if (typeof (book as any).author === 'string') return (book as any).author;
    if (book.authors && Array.isArray(book.authors)) {
      return book.authors.map((a: any) => (typeof a === 'string' ? a : a.name)).join(', ');
    }
    return '';
  };

  const authorName = renderAuthor();

  return (
    <div className="group relative aspect-[2/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800 shadow-sm hover:shadow-lg transition-all duration-300">
      <Link to={`/book/${book.id}`} className="block h-full w-full">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center bg-gray-100 dark:bg-slate-800">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-slate-500" />
            <span className="line-clamp-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
              {book.title}
            </span>
          </div>
        )}

        {/* Overlay com título e autor que aparece ao passar o mouse */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="line-clamp-2 text-xs font-semibold text-white">{book.title}</p>
          {authorName && <p className="truncate text-[10px] text-white/70">{authorName}</p>}
        </div>

        {/* Bolinha Indicadora de Status */}
        {book.status && (
          <span
            title={book.status}
            className={`absolute right-2.5 top-2.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              statusColors[book.status] || 'bg-gray-400'
            }`}
          />
        )}
      </Link>

      {/* Botões de Ação sobrepostos na parte superior quando fornecidos */}
      {(onEdit || onDelete) && (
        <div className="absolute left-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(book)}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white transition"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(book.id)}
              className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}