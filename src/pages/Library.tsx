/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Book, BookStatus, BookFormat, BOOK_STATUSES, BOOK_FORMATS } from '@/lib/types';
import { BookCard } from '@/components/BookCard';
import { Search, SlidersHorizontal, Plus, ChevronLeft, ChevronRight, X, Book as BookIcon, Headphones, Tablet, Loader2 } from 'lucide-react';

const PER_PAGE = 24;

export function Library() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [query, setQuery] = useState<string>('');
  const [status, setStatus] = useState<BookStatus | 'all'>('all');
  const [format, setFormat] = useState<BookFormat | 'all'>('all');
  const [genre, setGenre] = useState<string>('all');
  const [minPages, setMinPages] = useState<string>('');
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name)), book_genres(genre)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((b: any) => ({
        ...b,
        authors: b.book_authors?.map((ba: any) => ba.author) ?? [],
        genres: b.book_genres?.map((bg: any) => bg.genre) ?? [],
      })) as Book[];

      setBooks(mapped);
    } catch (err) {
      console.error('Erro ao carregar livros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return;
    
    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      fetchBooks();
    } catch (err) {
      console.error('Erro ao deletar livro:', err);
    }
  };

  const handleEdit = (book: Book) => {
    navigate(`/book/${book.id}`);
  };

  const genres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.primary_genre) set.add(b.primary_genre);
      (b.genres ?? []).forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [books]);

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (format !== 'all' && b.format !== format) return false;
      if (genre !== 'all' && b.primary_genre !== genre && !(b.genres ?? []).includes(genre)) return false;
      if (minPages && (!b.pages || b.pages < parseInt(minPages))) return false;
      if (authorFilter && !(b.authors ?? []).some((a) => a.name.toLowerCase().includes(authorFilter.toLowerCase()))) return false;
      
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          b.title.toLowerCase().includes(q) ||
          (b.isbn10 ?? '').includes(q) ||
          (b.isbn13 ?? '').includes(q) ||
          (b.authors ?? []).some((a) => a.name.toLowerCase().includes(q)) ||
          (b.publisher?.name ?? '').toLowerCase().includes(q) ||
          (b.series?.name ?? '').toLowerCase().includes(q) ||
          (b.language ?? '').toLowerCase().includes(q) ||
          (b.primary_genre ?? '').toLowerCase().includes(q) ||
          (b.genres ?? []).some((g) => g.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [books, status, format, genre, minPages, authorFilter, query]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const pageBooks = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = useMemo(() => {
    const physical = books.filter((b) => b.format === 'Físico').length;
    const ebooks = books.filter((b) => ['Ebook', 'Kindle', 'PDF'].includes(b.format)).length;
    const audio = books.filter((b) => b.format === 'Audiolivro').length;
    return { physical, ebooks, audio };
  }, [books]);

  const activeFilters = (status !== 'all' ? 1 : 0) + (format !== 'all' ? 1 : 0) + (genre !== 'all' ? 1 : 0) + (minPages ? 1 : 0) + (authorFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Leituras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} {filtered.length === 1 ? 'livro' : 'livros'}</p>
        </div>
        <button onClick={() => navigate('/add')} className="btn-primary">
          <Plus className="h-4 w-4 mr-1" /> Adicionar Livro
        </button>
      </div>

      {/* Contadores por Formato */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
            <BookIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Físicos</p>
            <p className="text-xl font-bold">{counts.physical}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <Tablet className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Ebooks</p>
            <p className="text-xl font-bold">{counts.ebooks}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Audiolivros</p>
            <p className="text-xl font-bold">{counts.audio}</p>
          </div>
        </div>
      </div>

      {/* Busca e Status Rápido */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por título, autor, ISBN, editora..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary ${showFilters ? 'ring-2 ring-brand-500/30' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" /> Filtros
          {activeFilters > 0 && (
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 ml-1">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as BookStatus | 'all'); setPage(1); }}>
              <option value="all">Todos</option>
              {BOOK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Formato</label>
            <select className="input" value={format} onChange={(e) => { setFormat(e.target.value as BookFormat | 'all'); setPage(1); }}>
              <option value="all">Todos</option>
              {BOOK_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Gênero</label>
            <select className="input" value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }}>
              <option value="all">Todos</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Páginas mínimas</label>
            <input type="number" className="input" placeholder="Ex: 500" value={minPages} onChange={(e) => { setMinPages(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="label">Autor</label>
            <input className="input" placeholder="Nome do autor" value={authorFilter} onChange={(e) => { setAuthorFilter(e.target.value); setPage(1); }} />
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => { setStatus('all'); setFormat('all'); setGenre('all'); setMinPages(''); setAuthorFilter(''); setPage(1); }}
              className="btn-ghost text-sm text-gray-500 col-span-full justify-start"
            >
              <X className="h-4 w-4 mr-1" /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid de Livros */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : pageBooks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum livro encontrado nesta busca.</p>
          <button onClick={() => navigate('/add')} className="btn-primary">
            <Plus className="h-4 w-4 mr-1" /> Adicionar primeiro livro
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pageBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500 px-3">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-3 py-2"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Library;