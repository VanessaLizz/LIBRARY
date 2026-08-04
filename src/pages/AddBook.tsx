/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { searchBooks, searchByIdentifier, GoogleBook } from '@/lib/googleBooks';
import { Book } from '@/lib/types';
import {
  BookFormat,
  BookStatus,
  Ownership,
  BOOK_FORMATS,
  BOOK_STATUSES,
  OWNERSHIPS,
} from '@/lib/types';
import { CoverUpload } from '@/components/CoverUpload';
import { useAuth } from '@/context/AuthContext';
import {
  BookPlus,
  Search,
  ScanLine,
  Loader2,
  Check,
  AlertCircle,
  X,
  BookCheck,
} from 'lucide-react';

type Tab = 'search' | 'isbn' | 'manual';

const GENRES = [
  'Ficção',
  'Não Ficção',
  'Fantasia',
  'Romance',
  'Mistério',
  'Suspense',
  'Ficção Científica',
  'Biografia',
  'Autoajuda',
  'História',
  'Tecnologia',
  'Outro',
];

function mapGenre(categories?: string[]): string {
  if (!categories || !categories.length) return 'Outro';

  const c = categories.join(' ').toLowerCase();

  if (c.includes('science fiction') || c.includes('sci-fi')) {
    return 'Ficção Científica';
  }
  if (c.includes('fantasy')) return 'Fantasia';
  if (c.includes('romance')) return 'Romance';
  if (c.includes('myster') || c.includes('crime')) return 'Mistério';
  if (c.includes('suspen') || c.includes('thrill')) return 'Suspense';
  if (c.includes('biograph')) return 'Biografia';
  if (c.includes('self help') || c.includes('self-help')) return 'Autoajuda';
  if (c.includes('history')) return 'História';
  if (c.includes('technology') || c.includes('comput')) return 'Tecnologia';
  if (c.includes('nonfiction') || c.includes('non fiction')) return 'Não Ficção';
  if (c.includes('fiction')) return 'Ficção';

  return 'Outro';
}

function normalizePublicationDate(raw?: string | null): string {
  if (!raw) return '';
  const value = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;

  return '';
}

function safeDateValue(value?: string | null): string {
  if (!value) return '';
  return normalizePublicationDate(value);
}

type DetectedIdentifier = {
  isbn10?: string;
  isbn13?: string;
  asin?: string;
};

function detectIdentifier(raw: string): DetectedIdentifier | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;

  const digits = value.replace(/[-\s]/g, '');

  if (/^\d{13}$/.test(digits)) return { isbn13: digits };
  if (/^\d{9}[\dX]$/.test(digits)) return { isbn10: digits };
  if (/^[A-Z0-9]{10}$/.test(value)) return { asin: value };

  return null;
}

export function AddBook() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('search');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [dbResults, setDbResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isbn, setIsbn] = useState('');
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);
  const [isbnSuccessNote, setIsbnSuccessNote] = useState<string | null>(null);

  const [rawIdentifierInput, setRawIdentifierInput] = useState('');

  const emptyForm = {
    title: '',
    subtitle: '',
    authors: '',
    translator: '',
    illustrator: '',
    publisher: '',
    edition: '',
    language: '',
    country: '',
    isbn10: '',
    isbn13: '',
    asin: '',
    pages: '',
    primary_genre: 'Outro',
    secondary_genres: '',
    series: '',
    volume: '',
    publication_date: '',
    synopsis: '',
    cover_url: '',
    tags: '',
    format: 'Físico' as BookFormat,
    status: 'Quero Ler' as BookStatus,
    ownership: 'Possuo' as Ownership,
    priority: 'média',
    target_year: '',
    rating: '',
    start_date: '',
    end_date: '',
    year_read: '',
    notes: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'search') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setDbResults([]);
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    debounceRef.current = setTimeout(async () => {
      const q = query.trim();

      // Busca no banco (RLS já filtra por user_id, mas filtramos explicitamente para garantir)
      try {
        let dbQuery = supabase
          .from('books')
          .select('*, book_authors(author:authors(name))')
          .ilike('title', `%${q}%`)
          .order('title', { ascending: true })
          .limit(20);

        if (user?.id) {
          dbQuery = dbQuery.eq('user_id', user.id) as typeof dbQuery;
        }

        const { data, error } = await dbQuery;
        if (!error) {
          setDbResults(
            (data ?? []).map((b: any) => ({
              ...b,
              authors: b.book_authors?.map((ba: any) => ba.author) ?? [],
            })) as Book[]
          );
        }
      } catch {
        setDbResults([]);
      }

      // Busca na API externa (Google Books com key, fallback Open Library)
      try {
        const apiResults = await searchBooks(q);
        setResults(apiResults);
      } catch {
        setResults([]);
      }

      setSearching(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, user?.id]);

  const fillForm = (book: GoogleBook) => {
    const detectedIsbn10 = book.isbn10 ?? '';
    const detectedIsbn13 = book.isbn13 ?? '';

    setForm((prev) => ({
      ...prev,
      title: book.title ?? prev.title,
      subtitle: book.subtitle ?? prev.subtitle,
      authors: (book.authors ?? []).join(', ') || prev.authors,
      publisher: book.publisher ?? prev.publisher,
      language: book.language ?? prev.language,
      isbn10: detectedIsbn10 || prev.isbn10,
      isbn13: detectedIsbn13 || prev.isbn13,
      asin: book.asin ?? prev.asin,
      pages: book.pageCount != null ? book.pageCount.toString() : prev.pages,
      primary_genre: mapGenre(book.categories),
      secondary_genres: (book.categories ?? []).slice(1).join(', '),
      publication_date: normalizePublicationDate(book.publishedDate) || prev.publication_date,
      synopsis: book.description ?? prev.synopsis,
      cover_url: book.coverUrl ?? prev.cover_url,
    }));

    if (detectedIsbn13) setRawIdentifierInput(detectedIsbn13);
    else if (detectedIsbn10) setRawIdentifierInput(detectedIsbn10);
    else if (book.asin) setRawIdentifierInput(book.asin);

    setTab('manual');
  };

  const handleIsbnLookup = async () => {
    setIsbnError(null);
    setIsbnSuccessNote(null);

    const code = isbn.trim();
    if (!code) {
      setIsbnError('Digite um ISBN ou ASIN válido.');
      return;
    }

    const detected = detectIdentifier(code);
    if (!detected) {
      setIsbnError('Código não reconhecido. Informe um ISBN-10, ISBN-13 ou ASIN.');
      return;
    }

    setIsbnLoading(true);

    try {
      const book = await searchByIdentifier(code);

      if (book) {
        fillForm(book);
        setIsbnSuccessNote(
          book.source
            ? `Dados encontrados via ${book.source}!`
            : 'Dados encontrados!'
        );
        return;
      }

      setIsbnError(
        'Nenhum livro encontrado para este código nas bases consultadas (Open Library e Google Books).'
      );
    } catch {
      setIsbnError(
        'Não foi possível buscar o código agora. Tente preencher manualmente.'
      );
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!form.title.trim()) {
      setError('Título é obrigatório.');
      return;
    }
    if (!user?.id) {
      setError('Usuário não autenticado.');
      return;
    }

    setSaving(true);

    try {
      const publicationDate = normalizePublicationDate(form.publication_date);

      // ── 1. INSERT book (somente colunas que existem na tabela books) ──────────
      const { data: book, error: insertError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          translator: form.translator.trim() || null,
          illustrator: form.illustrator.trim() || null,
          edition: form.edition.trim() || null,
          language: form.language.trim() || null,
          country: form.country.trim() || null,
          isbn10: form.isbn10.trim() || null,
          isbn13: form.isbn13.trim() || null,
          asin: form.asin.trim() || null,
          pages: form.pages ? parseInt(form.pages, 10) : null,
          primary_genre: form.primary_genre || null,
          volume: form.volume ? parseInt(form.volume, 10) : null,
          publication_date: publicationDate || null,
          synopsis: form.synopsis.trim() || null,
          cover_url: form.cover_url.trim() || null,
          tags: form.tags
            ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          format: form.format,
          status: form.status,
          ownership: form.ownership,
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      if (!book) throw new Error('Falha ao salvar o livro.');

      // ── 2. Publisher → publishers + books.publisher_id ────────────────────────
      if (form.publisher.trim()) {
        const { data: pub } = await supabase
          .from('publishers')
          .upsert(
            { user_id: user.id, name: form.publisher.trim() },
            { onConflict: 'user_id,name' }
          )
          .select()
          .maybeSingle();
        if (pub) {
          await supabase.from('books').update({ publisher_id: pub.id }).eq('id', book.id);
        }
      }

      // ── 3. Série → series + books.series_id ──────────────────────────────────
      if (form.series.trim()) {
        const { data: ser } = await supabase
          .from('series')
          .upsert(
            { user_id: user.id, name: form.series.trim() },
            { onConflict: 'user_id,name' }
          )
          .select()
          .maybeSingle();
        if (ser) {
          await supabase.from('books').update({ series_id: ser.id }).eq('id', book.id);
        }
      }

      // ── 4. Autores → authors + book_authors ───────────────────────────────────
      for (const name of form.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)) {
        const { data: author } = await supabase
          .from('authors')
          .upsert({ user_id: user.id, name }, { onConflict: 'user_id,name' })
          .select()
          .maybeSingle();
        if (author) {
          await supabase
            .from('book_authors')
            .insert({ book_id: book.id, author_id: author.id });
        }
      }

      // ── 5. Gêneros adicionais → book_genres ───────────────────────────────────
      const extraGenres = form.secondary_genres
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g && g !== form.primary_genre);
      for (const g of extraGenres) {
        await supabase.from('book_genres').insert({ book_id: book.id, genre: g });
      }

      // ── 6. Dados de leitura → readings ────────────────────────────────────────
      // Cria registro em readings sempre que o status indica leitura ativa ou concluída.
      // Sem isso, livros marcados como "Concluído" não aparecem no histórico/Dashboard.
      const startDate = safeDateValue(form.start_date);
      const endDate = safeDateValue(form.end_date);
      const shouldCreateReading = form.status !== 'Quero Ler';

      if (shouldCreateReading) {
        const pagesTotal = form.pages ? parseInt(form.pages, 10) : 0;
        const isCompleted = form.status === 'Concluído';
        await supabase.from('readings').insert({
          book_id: book.id,
          status: form.status,
          format: form.format,
          start_date: startDate || null,
          end_date: endDate || null,
          progress: isCompleted ? 100 : 0,
          pages_read: isCompleted ? pagesTotal : 0,
          pages_remaining: isCompleted ? 0 : pagesTotal,
          rating: form.rating ? parseFloat(form.rating) : 0,
          favorite: false,
          reread: false,
          review: form.notes.trim() || null,
        });
      }

      navigate(`/book/${book.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar o livro.'
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'search', label: 'Pesquisar por nome', icon: Search },
    { id: 'isbn', label: 'Buscar por ISBN', icon: ScanLine },
    { id: 'manual', label: 'Cadastro manual', icon: BookPlus },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Adicionar Livro</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Busque automaticamente ou cadastre manualmente
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-4">
          <div className="card p-5">
            <label className="label">Pesquisar livro</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Digite o título ou autor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {searching && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pesquisando...
            </div>
          )}

          {!searching && query.trim() && dbResults.length === 0 && results.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              Nenhum livro encontrado.
            </div>
          )}

          {/* Resultados do banco (Na biblioteca) */}
          {dbResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Na sua biblioteca</p>
              <div className="space-y-3">
                {dbResults.map((book) => {
                  const authorNames = (book.authors ?? []).map((a: any) =>
                    typeof a === 'string' ? a : a?.name ?? ''
                  ).filter(Boolean);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        const asGoogleBook: GoogleBook = {
                          id: book.id,
                          title: book.title,
                          subtitle: book.subtitle ?? undefined,
                          authors: authorNames,
                          publisher: (book.publisher as any)?.name ?? undefined,
                          pageCount: book.pages ?? undefined,
                          isbn10: book.isbn10 ?? undefined,
                          isbn13: book.isbn13 ?? undefined,
                          coverUrl: book.cover_url ?? undefined,
                          description: book.synopsis ?? undefined,
                          publishedDate: book.publication_date ?? undefined,
                        };
                        fillForm(asGoogleBook);
                      }}
                      className="w-full card p-4 flex gap-4 text-left hover:border-brand-400 transition-colors"
                    >
                      <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-slate-800">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookPlus className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{book.title}</h3>
                          <span className="shrink-0 text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-2 py-0.5 rounded-full">Na biblioteca</span>
                        </div>
                        {book.subtitle && <p className="text-sm text-gray-500">{book.subtitle}</p>}
                        {authorNames.length > 0 && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{authorNames.join(', ')}</p>}
                        {(book.publisher as any)?.name && <p className="text-xs text-gray-500 mt-1">{(book.publisher as any).name}</p>}
                        {book.status && <p className="text-xs text-gray-400 mt-1">{book.status}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resultados da API (Google Books) */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Resultados externos</p>
              <div className="space-y-3">
                {results.map((book, index) => (
                  <button
                    key={book.id ?? `${book.title}-${index}`}
                    type="button"
                    onClick={() => fillForm(book)}
                    className="w-full card p-4 flex gap-4 text-left hover:border-brand-400 transition-colors"
                  >
                    <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-slate-800">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookPlus className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{book.title}</h3>
                      {book.subtitle && <p className="text-sm text-gray-500">{book.subtitle}</p>}
                      {book.authors && book.authors.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{book.authors.join(', ')}</p>
                      )}
                      {book.publisher && <p className="text-xs text-gray-500 mt-1">{book.publisher}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'isbn' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">ISBN-10, ISBN-13 ou ASIN</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ex.: 9788535913778, 8535913778 ou B0XXXXX"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleIsbnLookup();
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleIsbnLookup}
                disabled={isbnLoading}
                className="btn-primary"
              >
                {isbnLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>
          </div>

          {isbnSuccessNote && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <BookCheck className="h-3.5 w-3.5" />
              {isbnSuccessNote}
            </p>
          )}

          {isbnError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              {isbnError}
            </div>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            A busca consulta Open Library e Google Books automaticamente,
            reconhecendo ISBN-10, ISBN-13 e ASIN.
          </p>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {user && (
            <div className="card p-4">
              <label className="label">Capa do livro</label>
              <CoverUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                userId={user.id}
              />
            </div>
          )}

          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Título *</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Subtítulo</label>
              <input
                className="input"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Autor(es) — separados por vírgula</label>
              <input
                className="input"
                value={form.authors}
                onChange={(e) => setForm({ ...form, authors: e.target.value })}
                placeholder="Ex: Autor 1, Autor 2"
              />
            </div>

            <div>
              <label className="label">Tradutor</label>
              <input
                className="input"
                value={form.translator}
                onChange={(e) => setForm({ ...form, translator: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Ilustrador</label>
              <input
                className="input"
                value={form.illustrator}
                onChange={(e) => setForm({ ...form, illustrator: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Editora</label>
              <input
                className="input"
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Edição</label>
              <input
                className="input"
                value={form.edition}
                onChange={(e) => setForm({ ...form, edition: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Idioma</label>
              <input
                className="input"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </div>

            <div>
              <label className="label">País</label>
              <input
                className="input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Código / Identificador</label>
              <input
                className="input"
                value={rawIdentifierInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setRawIdentifierInput(value);
                  const detected = value.trim() ? detectIdentifier(value) : null;
                  setForm((prev) => ({
                    ...prev,
                    isbn10: detected?.isbn10 ?? '',
                    isbn13: detected?.isbn13 ?? '',
                    asin: detected?.asin ?? '',
                  }));
                }}
                placeholder="ISBN-10, ISBN-13 ou ASIN"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite apenas um código. O sistema identifica automaticamente se é ISBN-10, ISBN-13 ou ASIN.
              </p>
            </div>

            <div>
              <label className="label">Número de páginas</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.pages}
                onChange={(e) => setForm({ ...form, pages: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Gênero Principal</label>
              <select
                className="input"
                value={form.primary_genre}
                onChange={(e) => setForm({ ...form, primary_genre: e.target.value })}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Gêneros secundários — separados por vírgula</label>
              <input
                className="input"
                value={form.secondary_genres}
                onChange={(e) => setForm({ ...form, secondary_genres: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Série</label>
              <input
                className="input"
                value={form.series}
                onChange={(e) => setForm({ ...form, series: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Volume</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Data de publicação</label>
              <input
                type="text"
                className="input"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                value={form.publication_date}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                  let formatted = digits;
                  if (digits.length > 2) {
                    formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
                  }
                  setForm((prev) => ({ ...prev, publication_date: formatted }));
                }}
              />
            </div>

            <div>
              <label className="label">Tags — separadas por vírgula</label>
              <input
                className="input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Formato</label>
              <select
                className="input"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as BookFormat })}
              >
                {BOOK_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })}
              >
                {BOOK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Posse</label>
              <select
                className="input"
                value={form.ownership}
                onChange={(e) => setForm({ ...form, ownership: e.target.value as Ownership })}
              >
                {OWNERSHIPS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Prioridade</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div>
              <label className="label">Avaliação (0 a 5)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.5"
                className="input"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Ano Meta</label>
              <select
                className="input"
                value={form.target_year}
                onChange={(e) => setForm({ ...form, target_year: e.target.value })}
              >
                <option value="">— Selecione —</option>
                {Array.from({ length: new Date().getFullYear() - 1899 + 2 }, (_, i) => new Date().getFullYear() + 2 - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Ano de Leitura</label>
              <select
                className="input"
                value={form.year_read}
                onChange={(e) => setForm({ ...form, year_read: e.target.value })}
              >
                <option value="">— Selecione —</option>
                {Array.from({ length: new Date().getFullYear() - 1899 + 2 }, (_, i) => new Date().getFullYear() + 2 - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Data de Início</label>
              <input
                type="date"
                className="input"
                value={safeDateValue(form.start_date)}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Data de Término</label>
              <input
                type="date"
                className="input"
                value={safeDateValue(form.end_date)}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Sinopse</label>
              <textarea
                rows={4}
                className="input"
                value={form.synopsis}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notas / Observações</label>
              <textarea
                rows={3}
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="btn-secondary"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar livro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
