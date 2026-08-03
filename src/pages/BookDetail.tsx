/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Book,
  Reading,
  Quote,
  BookStatus,
  BookFormat,
  BOOK_STATUSES,
  MOODS,
  DIFFICULTIES,
} from '@/lib/types';
import { StarRating } from '@/components/StarRating';
import {
  ArrowLeft,
  Loader2,
  Heart,
  Trash2,
  Plus,
  BookOpen,
  Quote as QuoteIcon,
} from 'lucide-react';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'readings' | 'quotes' | 'review'
  >('readings');

  const [showReadingForm, setShowReadingForm] = useState(false);

  const [readingForm, setReadingForm] = useState({
    status: 'Lendo' as BookStatus,
    start_date: '',
    end_date: '',
    progress: 0,
    pages_read: 0,
    pages_remaining: 0,
    rating: 0,
    favorite: false,
    reread: false,
    mood: '',
    difficulty: '',
    would_recommend: '',
    review: '',
  });

  const [quoteForm, setQuoteForm] = useState({
    content: '',
    page: '',
  });

  const [showQuoteForm, setShowQuoteForm] = useState(false);

  /*
   * Calcula automaticamente as páginas com base na porcentagem.
   */
  const calculatePages = (progress: number) => {
    if (!book?.pages) {
      return {
        pages_read: 0,
        pages_remaining: 0,
      };
    }

    const safeProgress = Math.min(100, Math.max(0, progress));

    const pagesRead = Math.round(
      (book.pages * safeProgress) / 100
    );

    const pagesRemaining = Math.max(
      0,
      book.pages - pagesRead
    );

    return {
      pages_read: pagesRead,
      pages_remaining: pagesRemaining,
    };
  };

  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      /*
       * Carrega o livro.
       */
      const { data: b, error: bookError } = await supabase
        .from('books')
        .select(
          '*, publisher:publishers(name), series:series(name), book_authors(author:authors(name)), book_genres(genre)'
        )
        .eq('id', id)
        .maybeSingle();

      if (bookError) throw bookError;

      if (b) {
        const mappedBook = {
          ...b,
          authors:
            b.book_authors?.map((ba: any) => ba.author) ?? [],
          genres:
            b.book_genres?.map((bg: any) => bg.genre) ?? [],
        } as Book;

        setBook(mappedBook);

        /*
         * Carrega a leitura mais recente.
         *
         * Como agora temos apenas UMA leitura atual,
         * usamos o registro mais recente.
         */
        const { data: r, error: readingError } = await supabase
          .from('readings')
          .select('*')
          .eq('book_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (readingError) throw readingError;

        setReading((r as Reading) ?? null);

        /*
         * Se já existe uma leitura, carregamos o último progresso.
         */
        if (r) {
          setReadingForm({
            status: r.status ?? 'Lendo',
            start_date: r.start_date ?? '',
            end_date: r.end_date ?? '',
            progress: r.progress ?? 0,
            pages_read: r.pages_read ?? 0,
            pages_remaining: r.pages_remaining ?? 0,
            rating: r.rating ?? 0,
            favorite: r.favorite ?? false,
            reread: r.reread ?? false,
            mood: r.mood ?? '',
            difficulty: r.difficulty ?? '',
            would_recommend: r.would_recommend ?? '',
            review: r.review ?? '',
          });
        } else {
          /*
           * Primeira leitura:
           * começa com 0%, mas o formato vem do cadastro
           * do livro e não pode ser alterado aqui.
           */
          setReadingForm({
            status: b.status ?? 'Quero Ler',
            start_date: '',
            end_date: '',
            progress: 0,
            pages_read: 0,
            pages_remaining: b.pages ?? 0,
            rating: 0,
            favorite: false,
            reread: false,
            mood: '',
            difficulty: '',
            would_recommend: '',
            review: '',
          });
        }
      }

      /*
       * Citações.
       */
      const { data: q, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: false });

      if (quoteError) throw quoteError;

      setQuotes((q as Quote[]) ?? []);
    } catch (err) {
      console.error('Erro ao carregar livro:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * Quando a porcentagem muda, calcula automaticamente
   * páginas lidas e páginas restantes.
   */
  const handleProgressChange = (value: number) => {
    const progress = Math.min(
      100,
      Math.max(0, value)
    );

    const pages = calculatePages(progress);

    setReadingForm((prev) => ({
      ...prev,
      progress,
      pages_read: pages.pages_read,
      pages_remaining: pages.pages_remaining,
    }));
  };

  /*
   * Salva ou atualiza a leitura.
   *
   * Se já existe uma leitura:
   * UPDATE
   *
   * Se ainda não existe:
   * INSERT
   */
  const saveReading = async () => {
    if (!id || !book) return;

    try {
      const pages = calculatePages(
        readingForm.progress
      );

      const payload = {
        book_id: id,
        status: readingForm.status,
        format: book.format as BookFormat,
        start_date:
          readingForm.start_date || null,
        end_date:
          readingForm.end_date || null,
        progress: readingForm.progress,
        pages_read: pages.pages_read,
        pages_remaining: pages.pages_remaining,
        rating: readingForm.rating,
        favorite: readingForm.favorite,
        reread: readingForm.reread,
        mood: readingForm.mood || null,
        difficulty:
          readingForm.difficulty || null,
        would_recommend:
          readingForm.would_recommend || null,
        review: readingForm.review || null,
      };

      if (reading?.id) {
        const { error } = await supabase
          .from('readings')
          .update(payload)
          .eq('id', reading.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('readings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        setReading(data as Reading);
      }

      /*
       * Mantém o status do livro sincronizado
       * com o status da leitura.
       */
      const { error: bookError } = await supabase
        .from('books')
        .update({
          status: readingForm.status,
        })
        .eq('id', id);

      if (bookError) throw bookError;

      setShowReadingForm(false);

      await loadData();
    } catch (err) {
      console.error(
        'Erro ao salvar leitura:',
        err
      );
    }
  };

  const deleteReading = async () => {
    if (!reading?.id) return;

    const confirmed = confirm(
      'Excluir o registro atual de leitura?'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('readings')
        .delete()
        .eq('id', reading.id);

      if (error) throw error;

      setReading(null);

      if (book) {
        setReadingForm({
          status: book.status ?? 'Quero Ler',
          start_date: '',
          end_date: '',
          progress: 0,
          pages_read: 0,
          pages_remaining: book.pages ?? 0,
          rating: 0,
          favorite: false,
          reread: false,
          mood: '',
          difficulty: '',
          would_recommend: '',
          review: '',
        });
      }

      await loadData();
    } catch (err) {
      console.error(
        'Erro ao excluir leitura:',
        err
      );
    }
  };

  const saveQuote = async () => {
    if (
      !id ||
      !quoteForm.content.trim()
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .insert({
          book_id: id,
          content: quoteForm.content,
          page: quoteForm.page
            ? parseInt(quoteForm.page)
            : null,
        });

      if (error) throw error;

      setQuoteForm({
        content: '',
        page: '',
      });

      setShowQuoteForm(false);

      await loadData();
    } catch (err) {
      console.error(
        'Erro ao salvar citação:',
        err
      );
    }
  };

  const deleteQuote = async (
    quoteId: string
  ) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error(
        'Erro ao excluir citação:',
        err
      );
    }
  };

  const deleteBook = async () => {
    if (!book) return;

    const confirmed = confirm(
      'Excluir este livro e todos os seus registros?'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);

      if (error) throw error;

      navigate('/library');
    } catch (err) {
      console.error(
        'Erro ao excluir livro:',
        err
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Livro não encontrado.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button
        onClick={() => navigate('/library')}
        className="btn-ghost text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Informações do livro */}
      <div className="card p-6 flex flex-col sm:flex-row gap-6">
        <div className="shrink-0 mx-auto sm:mx-0">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-52 w-36 object-cover rounded-xl shadow-lg"
            />
          ) : (
            <div className="h-52 w-36 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-gray-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">
            {book.title}
          </h1>

          {book.subtitle && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {book.subtitle}
            </p>
          )}

          <p className="text-sm text-gray-400 mt-2">
            {book.authors
              ?.map((a) => a.name)
              .join(', ') ||
              'Autor desconhecido'}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {book.status && (
              <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {book.status}
              </span>
            )}

            {book.format && (
              <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                {book.format}
              </span>
            )}

            {book.primary_genre && (
              <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                {book.primary_genre}
              </span>
            )}

            {book.ownership && (
              <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                {book.ownership}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div>
              <span className="text-gray-400">
                Páginas
              </span>
              <p className="font-semibold">
                {book.pages ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-gray-400">
                Editora
              </span>
              <p className="font-semibold truncate">
                {book.publisher?.name ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-gray-400">
                Idioma
              </span>
              <p className="font-semibold">
                {book.language ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-gray-400">
                Publicação
              </span>
              <p className="font-semibold">
                {book.publication_date ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-gray-400">
                ISBN-13
              </span>
              <p className="font-semibold">
                {book.isbn13 ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-gray-400">
                ISBN-10
              </span>
              <p className="font-semibold">
                {book.isbn10 ?? '—'}
              </p>
            </div>

            {book.series && (
              <div>
                <span className="text-gray-400">
                  Série
                </span>
                <p className="font-semibold truncate">
                  {book.series.name}
                  {book.volume ? ` #${book.volume} ` : ''}
                </p>
              </div>
            )}
          </div>

          {book.synopsis && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 line-clamp-4">
              {book.synopsis}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowReadingForm(true)}
              className="btn-primary text-sm"
            >
              <Plus className="h-4 w-4" />
              {reading
                ? 'Atualizar leitura'
                : 'Registrar leitura'}
            </button>

            <button
              onClick={deleteBook}
              className="btn-ghost text-sm text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>

      {/* Modal de leitura */}
      {showReadingForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setShowReadingForm(false)
          }
        >
          <div
            className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2 className="text-lg font-bold mb-4">
              {reading
                ? 'Atualizar leitura'
                : 'Registrar leitura'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <label className="label">
                  Status
                </label>

                <select
                  className="input"
                  value={readingForm.status}
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      status:
                        e.target.value as BookStatus,
                    })
                  }
                >
                  {BOOK_STATUSES.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Formato fixo */}
              <div>
                <label className="label">
                  Formato
                </label>

                <input
                  className="input bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
                  value={book.format ?? '—'}
                  disabled
                  readOnly
                />
              </div>

              {/* Datas */}
              <div>
                <label className="label">
                  Início
                </label>

                <input
                  type="date"
                  className="input"
                  value={readingForm.start_date}
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      start_date:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">
                  Término
                </label>

                <input
                  type="date"
                  className="input"
                  value={readingForm.end_date}
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      end_date:
                        e.target.value,
                    })
                  }
                />
              </div>

              {/* Progresso */}
              <div>
                <label className="label">
                  Progresso (%)
                </label>

                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={readingForm.progress}
                  onChange={(e) =>
                    handleProgressChange(
                      parseInt(
                        e.target.value
                      ) || 0
                    )
                  }
                />
              </div>

              {/* Páginas lidas calculadas */}
              <div>
                <label className="label">
                  Páginas lidas
                </label>

                <input
                  type="number"
                  className="input bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
                  value={
                    readingForm.pages_read
                  }
                  disabled
                  readOnly
                />
              </div>

              {/* Páginas restantes calculadas */}
              <div>
                <label className="label">
                  Páginas restantes
                </label>

                <input
                  type="number"
                  className="input bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
                  value={
                    readingForm.pages_remaining
                  }
                  disabled
                  readOnly
                />
              </div>

              {/* Nota */}
              <div className="col-span-2">
                <label className="label">
                  Nota
                </label>

                <StarRating
                  value={readingForm.rating}
                  onChange={(value) =>
                    setReadingForm({
                      ...readingForm,
                      rating: value,
                    })
                  }
                  size={28}
                />
              </div>

              {/* Humor */}
              <div>
                <label className="label">
                  Humor
                </label>

                <select
                  className="input"
                  value={readingForm.mood}
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      mood: e.target.value,
                    })
                  }
                >
                  <option value="">
                    —
                  </option>

                  {MOODS.map((mood) => (
                    <option
                      key={mood}
                      value={mood}
                    >
                      {mood}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dificuldade */}
              <div>
                <label className="label">
                  Dificuldade
                </label>

                <select
                  className="input"
                  value={
                    readingForm.difficulty
                  }
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      difficulty:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    —
                  </option>

                  {DIFFICULTIES.map(
                    (difficulty) => (
                      <option
                        key={difficulty}
                        value={difficulty}
                      >
                        {difficulty}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Recomendação */}
              <div>
                <label className="label">
                  Recomendaria?
                </label>

                <select
                  className="input"
                  value={
                    readingForm.would_recommend
                  }
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      would_recommend:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    —
                  </option>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>

              {/* Favorito / Releitura */}
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      readingForm.favorite
                    }
                    onChange={(e) =>
                      setReadingForm({
                        ...readingForm,
                        favorite:
                          e.target.checked,
                      })
                    }
                    className="rounded"
                  />

                  <Heart className="h-4 w-4" />

                  Favorito
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      readingForm.reread
                    }
                    onChange={(e) =>
                      setReadingForm({
                        ...readingForm,
                        reread:
                          e.target.checked,
                      })
                    }
                    className="rounded"
                  />

                  Releitura
                </label>
              </div>

              {/* Resenha */}
              <div className="col-span-2">
                <label className="label">
                  Resenha
                </label>

                <textarea
                  className="input min-h-[80px]"
                  value={
                    readingForm.review
                  }
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      review:
                        e.target.value,
                    })
                  }
                  placeholder="Sua opinião sobre o livro..."
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-4">
              <div>
                {reading && (
                  <button
                    onClick={deleteReading}
                    className="btn-ghost text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir leitura
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setShowReadingForm(false)
                  }
                  className="btn-secondary"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveReading}
                  className="btn-primary"
                >
                  Salvar leitura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800">
        {[
          [
            'readings',
            'Leitura',
            reading ? 1 : 0,
          ],
          [
            'quotes',
            'Citações',
            quotes.length,
          ],
          [
            'review',
            'Resenha',
            reading?.review ? 1 : 0,
          ],
        ].map(
          ([key, label, count]) => (
            <button
              key={key}
              onClick={() =>
                setActiveTab(
                  key as
                  | 'readings'
                  | 'quotes'
                  | 'review'
                )
              }
              className={`px - 4 py - 2.5 text - sm font - medium border - b - 2 transition - colors ${activeTab === key
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                } `}
            >
              {label}{' '}
              {Number(count) > 0 && (
                <span className="text-xs text-gray-400">
                  ({count})
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* Leitura atual */}
      {activeTab === 'readings' && (
        <div className="space-y-3">
          {!reading ? (
            <div className="card p-8 text-center text-gray-500">
              Nenhuma leitura registrada.
              Clique em "Registrar leitura"
              para começar.
            </div>
          ) : (
            <div className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                      {reading.status}
                    </span>

                    <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                      {book.format}
                    </span>

                    {reading.favorite && (
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    )}

                    {reading.reread && (
                      <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        Releitura
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                    <div>
                      <span className="text-gray-400">
                        Início
                      </span>
                      <p>
                        {reading.start_date ??
                          '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400">
                        Término
                      </span>
                      <p>
                        {reading.end_date ??
                          '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400">
                        Progresso
                      </span>
                      <p>
                        {reading.progress}%
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400">
                        Páginas lidas
                      </span>
                      <p>
                        {reading.pages_read}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400">
                        Restantes
                      </span>
                      <p>
                        {reading.pages_remaining}
                      </p>
                    </div>
                  </div>

                  {reading.rating > 0 && (
                    <div className="mt-2">
                      <StarRating
                        value={
                          reading.rating
                        }
                        size={16}
                      />
                    </div>
                  )}

                  {reading.mood && (
                    <p className="text-xs text-gray-400 mt-2">
                      Humor: {reading.mood}

                      {reading.difficulty
                        ? ` · Dificuldade: ${reading.difficulty} `
                        : ''}

                      {reading.would_recommend
                        ? ` · Recomendaria: ${reading.would_recommend} `
                        : ''}
                    </p>
                  )}

                  {reading.review && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
                      "{reading.review}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    setShowReadingForm(true)
                  }
                  className="btn-secondary text-sm"
                >
                  Atualizar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citações */}
      {activeTab === 'quotes' && (
        <div className="space-y-3">
          <button
            onClick={() =>
              setShowQuoteForm(true)
            }
            className="btn-secondary text-sm"
          >
            <Plus className="h-4 w-4" />
            Adicionar citação
          </button>

          {showQuoteForm && (
            <div className="card p-4 space-y-3">
              <textarea
                className="input min-h-[80px]"
                placeholder="Citação favorita..."
                value={
                  quoteForm.content
                }
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    content:
                      e.target.value,
                  })
                }
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  className="input max-w-[120px]"
                  placeholder="Página"
                  value={quoteForm.page}
                  onChange={(e) =>
                    setQuoteForm({
                      ...quoteForm,
                      page: e.target.value,
                    })
                  }
                />

                <button
                  onClick={saveQuote}
                  className="btn-primary"
                >
                  Salvar
                </button>

                <button
                  onClick={() =>
                    setShowQuoteForm(false)
                  }
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {quotes.length === 0 &&
            !showQuoteForm ? (
            <div className="card p-8 text-center text-gray-500">
              <QuoteIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Nenhuma citação registrada.
            </div>
          ) : (
            quotes.map((quote) => (
              <div
                key={quote.id}
                className="card p-4 flex items-start gap-3"
              >
                <QuoteIcon className="h-5 w-5 text-brand-400 shrink-0 mt-1" />

                <div className="flex-1">
                  <p className="text-sm italic text-gray-700 dark:text-gray-300">
                    "{quote.content}"
                  </p>

                  {quote.page && (
                    <p className="text-xs text-gray-400 mt-1">
                      Página {quote.page}
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    deleteQuote(
                      quote.id
                    )
                  }
                  className="btn-ghost text-red-500 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Resenha */}
      {activeTab === 'review' && (
        <div className="space-y-3">
          {!reading?.review ? (
            <div className="card p-8 text-center text-gray-500">
              Nenhuma resenha escrita ainda.
            </div>
          ) : (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                {reading.rating > 0 && (
                  <StarRating
                    value={
                      reading.rating
                    }
                    size={14}
                  />
                )}

                <span className="text-xs text-gray-400">
                  {reading.end_date ??
                    reading.start_date ??
                    ''}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                {reading.review}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BookDetail;
