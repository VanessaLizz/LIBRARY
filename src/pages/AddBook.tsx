import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { searchBooks, searchByIsbn, GoogleBook } from '@/lib/googleBooks';
import { BookFormat, BookStatus, Ownership, BOOK_FORMATS, BOOK_STATUSES, OWNERSHIPS } from '@/lib/types';
import { CoverUpload } from '@/components/CoverUpload';
import { useAuth } from '@/context/AuthContext';
import { BookPlus, Search, ScanLine, Loader2, Check, AlertCircle, X, BookCheck } from 'lucide-react';

type Tab = 'search' | 'isbn' | 'manual';

const GENRES = ['Ficção', 'Não Ficção', 'Fantasia', 'Romance', 'Mistério', 'Suspense', 'Ficção Científica', 'Biografia', 'Autoajuda', 'História', 'Tecnologia', 'Outro'];

function mapGenre(categories?: string[]): string {
  if (!categories || !categories.length) return 'Outro';
  const c = categories.join(' ').toLowerCase();
  if (c.includes('science fiction') || c.includes('sci-fi')) return 'Ficção Científica';
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

export function AddBook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [isbn, setIsbn] = useState('');
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);
  const [isbnSuccessNote, setIsbnSuccessNote] = useState<string | null>(null);

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
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try { setResults(await searchBooks(query)); } catch { setResults([]); }
      setSearching(false);
    }, 400);
  }, [query, tab]);

  const fillForm = (b: GoogleBook) => {
    setForm((prev) => ({
      ...prev,
      title: b.title ?? prev.title,
      subtitle: b.subtitle ?? prev.subtitle,
      authors: (b.authors ?? []).join(', ') || prev.authors,
      publisher: b.publisher ?? prev.publisher,
      language: b.language ?? prev.language,
      country: b.country ?? prev.country,
      isbn10: b.isbn10 ?? prev.isbn10,
      isbn13: b.isbn13 ?? prev.isbn13,
      pages: b.pageCount?.toString() ?? prev.pages,
      primary_genre: mapGenre(b.categories),
      secondary_genres: (b.categories ?? []).slice(1).join(', '),
      publication_date: b.publishedDate?.split('T')[0] ?? prev.publication_date,
      synopsis: b.description ?? prev.synopsis,
      cover_url: b.coverUrl ?? prev.cover_url,
    }));
    setTab('manual');
  };

  const handleIsbnLookup = async () => {
    setIsbnError(null);
    setIsbnSuccessNote(null);
    const code = isbn.replace(/\D/g, '');
    if (!code) return;

    setIsbnLoading(true);

    try {
      // 1ª Tentativa: Busca no Google Books
      let book = await searchByIsbn(code);
      if (book) {
        fillForm(book);
        setIsbnSuccessNote('Dados e capa encontrados no Google Books!');
        return;
      }

      // 2ª Tentativa (Fallback): Open Library API (Base44)
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${code}&format=json&jscmd=data`);
      const data = await res.json();
      const info = data[`ISBN:${code}`];

      if (info) {
        const cover = info.cover?.large || info.cover?.medium || `https://covers.openlibrary.org/b/isbn/${code}-L.jpg`;
        setForm((prev) => ({
          ...prev,
          title: info.title || prev.title,
          authors: info.authors?.map((a: any) => a.name).join(', ') || prev.authors,
          pages: info.number_of_pages?.toString() || info.number_of_pages_median?.toString() || prev.pages,
          cover_url: cover || prev.cover_url,
          primary_genre: mapGenre(info.subjects?.map((s: any) => s.name)),
          isbn13: code.length === 13 ? code : prev.isbn13,
          isbn10: code.length === 10 ? code : prev.isbn10,
        }));
        setIsbnSuccessNote('Dados e capa preenchidos via Open Library!');
        setTab('manual');
      } else {
        setIsbnError('Nenhum livro encontrado para este ISBN nas bases de dados.');
      }
    } catch {
      setIsbnError('Não foi possível buscar o ISBN agora. Tente preencher manualmente.');
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!form.title.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);

    try {
      const { data: book, error: insertError } = await supabase.from('books').insert({
        title: form.title,
        subtitle: form.subtitle || null,
        translator: form.translator || null,
        illustrator: form.illustrator || null,
        edition: form.edition || null,
        language: form.language || null,
        country: form.country || null,
        isbn10: form.isbn10 || null,
        isbn13: form.isbn13 || null,
        pages: form.pages ? parseInt(form.pages, 10) : null,
        primary_genre: form.primary_genre || null,
        publication_date: form.publication_date || null,
        synopsis: form.synopsis || null,
        cover_url: form.cover_url || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        format: form.format,
        status: form.status,
        ownership: form.ownership,
        volume: form.volume ? parseInt(form.volume, 10) : null,
        rating: form.rating ? parseFloat(form.rating) : null,
        target_year: form.target_year ? parseInt(form.target_year, 10) : null,
        year_read: form.year_read ? parseInt(form.year_read, 10) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
        user_id: user?.id,
      }).select().maybeSingle();

      if (insertError) throw insertError;
      if (!book) throw new Error('Falha ao salvar o livro');

      if (form.publisher.trim()) {
        const { data: pub } = await supabase.from('publishers').upsert({ name: form.publisher.trim() }, { onConflict: 'user_id,name' }).select().maybeSingle();
        if (pub) await supabase.from('books').update({ publisher_id: pub.id }).eq('id', book.id);
      }

      if (form.series.trim()) {
        const { data: ser } = await supabase.from('series').upsert({ name: form.series.trim() }, { onConflict: 'user_id,name' }).select().maybeSingle();
        if (ser) await supabase.from('books').update({ series_id: ser.id }).eq('id', book.id);
      }

      for (const name of form.authors.split(',').map((a) => a.trim()).filter(Boolean)) {
        const { data: author } = await supabase.from('authors').upsert({ name }, { onConflict: 'user_id,name' }).select().maybeSingle();
        if (author) await supabase.from('book_authors').insert({ book_id: book.id, author_id: author.id });
      }

      const allGenres = [form.primary_genre, ...form.secondary_genres.split(',').map((g) => g.trim())].filter(Boolean);
      for (const g of allGenres) {
        await supabase.from('book_genres').insert({ book_id: book.id, genre: g });
      }

      navigate(`/book/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o livro.');
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
        <p className="text-sm text-gray-500 dark:text-gray-400">Busque automaticamente ou cadastre manualmente</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Digite o nome do livro ou autor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((r) => (
                <button key={r.id} onClick={() => fillForm(r)} className="card p-3 flex gap-3 text-left hover:shadow-md transition group">
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt="" className="h-20 w-14 object-cover rounded shrink-0" />
                  ) : (
                    <div className="h-20 w-14 bg-gray-100 dark:bg-slate-800 rounded shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{r.title}</p>
                    {r.authors && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.authors.join(', ')}</p>}
                    <p className="text-xs text-gray-400 mt-1">{r.publishedDate} · {r.pageCount ?? '—'} pág</p>
                    <span className="text-xs text-brand-600 dark:text-brand-400 mt-1 inline-flex items-center gap-1 group-hover:underline">
                      <Check className="h-3 w-3" /> Selecionar
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!searching && query && results.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">Nenhum resultado encontrado.</p>
              <button onClick={() => setTab('manual')} className="btn-secondary">
                <BookPlus className="h-4 w-4" /> Cadastrar manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'isbn' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">ISBN (10 ou 13 dígitos)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ex.: 9788535913778"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIsbnLookup()}
              />
              <button onClick={handleIsbnLookup} disabled={isbnLoading} className="btn-primary">
                {isbnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
              </button>
            </div>
          </div>
          {isbnSuccessNote && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <BookCheck className="h-3.5 w-3.5" /> {isbnSuccessNote}
            </p>
          )}
          {isbnError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" /> {isbnError}
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Informe o ISBN e os dados serão buscados automaticamente no Google Books / Open Library.
          </p>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {user && (
            <div className="card p-4">
              <label className="label">Capa do livro</label>
              <CoverUpload value={form.cover_url} onChange={(url) => setForm({ ...form, cover_url: url })} userId={user.id} />
            </div>
          )}

          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Título *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Subtítulo</label>
              <input className="input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Autor(es) — separados por vírgula</label>
              <input className="input" value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} placeholder="Ex: Autor 1, Autor 2" />
            </div>
            <div>
              <label className="label">Tradutor</label>
              <input className="input" value={form.translator} onChange={(e) => setForm({ ...form, translator: e.target.value })} />
            </div>
            <div>
              <label className="label">Ilustrador</label>
              <input className="input" value={form.illustrator} onChange={(e) => setForm({ ...form, illustrator: e.target.value })} />
            </div>
            <div>
              <label className="label">Editora</label>
              <input className="input" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            </div>
            <div>
              <label className="label">Edição</label>
              <input className="input" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} />
            </div>
            <div>
              <label className="label">Idioma</label>
              <input className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
            </div>
            <div>
              <label className="label">País</label>
              <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="label">ISBN-10</label>
              <input className="input" value={form.isbn10} onChange={(e) => setForm({ ...form, isbn10: e.target.value })} />
            </div>
            <div>
              <label className="label">ISBN-13</label>
              <input className="input" value={form.isbn13} onChange={(e) => setForm({ ...form, isbn13: e.target.value })} />
            </div>
            <div>
              <label className="label">Número de páginas</label>
              <input type="number" className="input" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} />
            </div>
            <div>
              <label className="label">Gênero Principal</label>
              <select className="input" value={form.primary_genre} onChange={(e) => setForm({ ...form, primary_genre: e.target.value })}>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gêneros secundários — separados por vírgula</label>
              <input className="input" value={form.secondary_genres} onChange={(e) => setForm({ ...form, secondary_genres: e.target.value })} />
            </div>
            <div>
              <label className="label">Série</label>
              <input className="input" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} />
            </div>
            <div>
              <label className="label">Volume</label>
              <input type="number" className="input" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
            </div>
            <div>
              <label className="label">Data de publicação</label>
              <input type="date" className="input" value={form.publication_date} onChange={(e) => setForm({ ...form, publication_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Tags — separadas por vírgula</label>
              <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>

            <div>
              <label className="label">Formato</label>
              <select className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as BookFormat })}>
                {BOOK_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })}>
                {BOOK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Posse</label>
              <select className="input" value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value as Ownership })}>
                {OWNERSHIPS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Avaliação (0 a 5)</label>
              <input type="number" min="0" max="5" step="0.5" className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="Ex.: 4.5" />
            </div>
            <div>
              <label className="label">Meta para o ano</label>
              <input type="number" className="input" value={form.target_year} onChange={(e) => setForm({ ...form, target_year: e.target.value })} placeholder={new Date().getFullYear().toString()} />
            </div>
            <div>
              <label className="label">Ano de leitura</label>
              <input type="number" className="input" value={form.year_read} onChange={(e) => setForm({ ...form, year_read: e.target.value })} placeholder={new Date().getFullYear().toString()} />
            </div>
            <div>
              <label className="label">Data de Início</label>
              <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Data de Conclusão</label>
              <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Sinopse</label>
              <textarea className="input min-h-[100px]" value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas e Impressões</label>
              <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Suas impressões sobre a leitura..." />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => navigate('/library')} className="btn-secondary">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar livro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}