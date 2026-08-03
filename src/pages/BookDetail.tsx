import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Book, Reading, Quote, BookStatus, BookFormat, BOOK_STATUSES, BOOK_FORMATS, MOODS, DIFFICULTIES } from '@/lib/types';
import { StarRating } from '@/components/StarRating';
import { ArrowLeft, Loader2, Heart, Trash2, Plus, BookOpen, Quote as QuoteIcon } from 'lucide-react';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'readings' | 'quotes' | 'review'>('readings');

  const [showReadingForm, setShowReadingForm] = useState(false);
  const [readingForm, setReadingForm] = useState({
    status: 'Lendo' as BookStatus, format: 'Físico' as BookFormat, start_date: '', end_date: '',
    progress: 0, pages_read: 0, pages_remaining: 0, rating: 0, favorite: false, reread: false,
    mood: '', difficulty: '', would_recommend: '', review: '',
  });
  const [quoteForm, setQuoteForm] = useState({ content: '', page: '' });
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const { data: b } = await supabase
      .from('books').select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name)), book_genres(genre)')
      .eq('id', id).maybeSingle();
    if (b) setBook({ ...b, authors: b.book_authors?.map((ba: any) => ba.author) ?? [], genres: b.book_genres?.map((bg: any) => bg.genre) ?? [] } as Book);
    const { data: r } = await supabase.from('readings').select('*').eq('book_id', id).order('created_at', { ascending: false });
    setReadings((r as Reading[]) ?? []);
    const { data: q } = await supabase.from('quotes').select('*').eq('book_id', id).order('created_at', { ascending: false });
    setQuotes((q as Quote[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const saveReading = async () => {
    if (!id) return;
    await supabase.from('readings').insert({
      book_id: id, status: readingForm.status, format: readingForm.format,
      start_date: readingForm.start_date || null, end_date: readingForm.end_date || null,
      progress: readingForm.progress, pages_read: readingForm.pages_read, pages_remaining: readingForm.pages_remaining,
      rating: readingForm.rating, favorite: readingForm.favorite, reread: readingForm.reread,
      mood: readingForm.mood || null, difficulty: readingForm.difficulty || null,
      would_recommend: readingForm.would_recommend || null, review: readingForm.review || null,
    });
    await supabase.from('books').update({ status: readingForm.status }).eq('id', id);
    setShowReadingForm(false);
    setReadingForm({ ...readingForm, status: 'Lendo', start_date: '', end_date: '', progress: 0, pages_read: 0, pages_remaining: 0, rating: 0, review: '' });
    loadData();
  };

  const deleteReading = async (rid: string) => { await supabase.from('readings').delete().eq('id', rid); loadData(); };

  const saveQuote = async () => {
    if (!id || !quoteForm.content.trim()) return;
    await supabase.from('quotes').insert({ book_id: id, content: quoteForm.content, page: quoteForm.page ? parseInt(quoteForm.page) : null });
    setQuoteForm({ content: '', page: '' }); setShowQuoteForm(false); loadData();
  };

  const deleteQuote = async (qid: string) => { await supabase.from('quotes').delete().eq('id', qid); loadData(); };

  const deleteBook = async () => {
    if (!book || !confirm('Excluir este livro e todos os seus registros?')) return;
    await supabase.from('books').delete().eq('id', book.id);
    navigate('/library');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  if (!book) return <div className="card p-8 text-center text-gray-500">Livro não encontrado.</div>;

  const avgRating = readings.length > 0 ? readings.reduce((s, r) => s + (r.rating ?? 0), 0) / readings.length : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate('/library')} className="btn-ghost text-sm"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      {/* Header */}
      <div className="card p-6 flex flex-col sm:flex-row gap-6">
        <div className="shrink-0 mx-auto sm:mx-0">
          {book.cover_url ? <img src={book.cover_url} alt={book.title} className="h-52 w-36 object-cover rounded-xl shadow-lg" /> : (
            <div className="h-52 w-36 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center"><BookOpen className="h-12 w-12 text-gray-300" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          {book.subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{book.subtitle}</p>}
          <p className="text-sm text-gray-400 mt-2">{book.authors?.map((a) => a.name).join(', ') ?? 'Autor desconhecido'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">{book.status}</span>
            <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">{book.format}</span>
            {book.primary_genre && <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">{book.primary_genre}</span>}
            <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">{book.ownership}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div><span className="text-gray-400">Páginas</span><p className="font-semibold">{book.pages ?? '—'}</p></div>
            <div><span className="text-gray-400">Editora</span><p className="font-semibold truncate">{book.publisher?.name ?? '—'}</p></div>
            <div><span className="text-gray-400">Idioma</span><p className="font-semibold">{book.language ?? '—'}</p></div>
            <div><span className="text-gray-400">Publicação</span><p className="font-semibold">{book.publication_date ?? '—'}</p></div>
            <div><span className="text-gray-400">ISBN-13</span><p className="font-semibold">{book.isbn13 ?? '—'}</p></div>
            <div><span className="text-gray-400">ISBN-10</span><p className="font-semibold">{book.isbn10 ?? '—'}</p></div>
            {book.series && <div><span className="text-gray-400">Série</span><p className="font-semibold truncate">{book.series?.name}{book.volume ? ` #${book.volume}` : ''}</p></div>}
            <div><span className="text-gray-400">Avaliação</span><p className="font-semibold flex items-center gap-1"><StarRating value={avgRating} size={14} /> {avgRating.toFixed(1)}</p></div>
          </div>
          {book.synopsis && <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 line-clamp-4">{book.synopsis}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowReadingForm(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Registrar leitura</button>
            <button onClick={deleteBook} className="btn-ghost text-sm text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4" /> Excluir</button>
          </div>
        </div>
      </div>

      {/* Reading form modal */}
      {showReadingForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReadingForm(false)}>
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Registrar leitura</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Status</label><select className="input" value={readingForm.status} onChange={(e) => setReadingForm({ ...readingForm, status: e.target.value as BookStatus })}>{BOOK_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Formato</label><select className="input" value={readingForm.format} onChange={(e) => setReadingForm({ ...readingForm, format: e.target.value as BookFormat })}>{BOOK_FORMATS.map((f) => <option key={f}>{f}</option>)}</select></div>
              <div><label className="label">Início</label><input type="date" className="input" value={readingForm.start_date} onChange={(e) => setReadingForm({ ...readingForm, start_date: e.target.value })} /></div>
              <div><label className="label">Término</label><input type="date" className="input" value={readingForm.end_date} onChange={(e) => setReadingForm({ ...readingForm, end_date: e.target.value })} /></div>
              <div><label className="label">Progresso (%)</label><input type="number" min={0} max={100} className="input" value={readingForm.progress} onChange={(e) => setReadingForm({ ...readingForm, progress: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="label">Páginas lidas</label><input type="number" className="input" value={readingForm.pages_read} onChange={(e) => setReadingForm({ ...readingForm, pages_read: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="label">Páginas restantes</label><input type="number" className="input" value={readingForm.pages_remaining} onChange={(e) => setReadingForm({ ...readingForm, pages_remaining: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><label className="label">Nota</label><StarRating value={readingForm.rating} onChange={(v) => setReadingForm({ ...readingForm, rating: v })} size={28} /></div>
              <div><label className="label">Humor</label><select className="input" value={readingForm.mood} onChange={(e) => setReadingForm({ ...readingForm, mood: e.target.value })}><option value="">—</option>{MOODS.map((m) => <option key={m}>{m}</option>)}</select></div>
              <div><label className="label">Dificuldade</label><select className="input" value={readingForm.difficulty} onChange={(e) => setReadingForm({ ...readingForm, difficulty: e.target.value })}><option value="">—</option>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div><label className="label">Recomendaria?</label><select className="input" value={readingForm.would_recommend} onChange={(e) => setReadingForm({ ...readingForm, would_recommend: e.target.value })}><option value="">—</option><option>Sim</option><option>Não</option></select></div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={readingForm.favorite} onChange={(e) => setReadingForm({ ...readingForm, favorite: e.target.checked })} className="rounded" /><Heart className="h-4 w-4" /> Favorito</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={readingForm.reread} onChange={(e) => setReadingForm({ ...readingForm, reread: e.target.checked })} className="rounded" /> Releitura</label>
              </div>
              <div className="col-span-2"><label className="label">Resenha</label><textarea className="input min-h-[80px]" value={readingForm.review} onChange={(e) => setReadingForm({ ...readingForm, review: e.target.value })} placeholder="Sua opinião sobre o livro..." /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowReadingForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveReading} className="btn-primary">Salvar leitura</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800">
        {([['readings', 'Leituras', readings.length], ['quotes', 'Citações', quotes.length], ['review', 'Resenhas', readings.filter((r) => r.review).length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {label} {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'readings' && (
        <div className="space-y-3">
          {readings.length === 0 ? <div className="card p-8 text-center text-gray-500">Nenhuma leitura registrada. Clique em "Registrar leitura" para começar.</div> : readings.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">{r.status}</span>
                    <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">{r.format}</span>
                    {r.favorite && <Heart className="h-4 w-4 text-red-500 fill-red-500" />}
                    {r.reread && <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Releitura</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                    <div><span className="text-gray-400">Início</span><p>{r.start_date ?? '—'}</p></div>
                    <div><span className="text-gray-400">Término</span><p>{r.end_date ?? '—'}</p></div>
                    <div><span className="text-gray-400">Progresso</span><p>{r.progress}%</p></div>
                    <div><span className="text-gray-400">Páginas lidas</span><p>{r.pages_read}</p></div>
                    {r.pages_remaining > 0 && <div><span className="text-gray-400">Restantes</span><p>{r.pages_remaining}</p></div>}
                  </div>
                  {r.rating > 0 && <div className="mt-2"><StarRating value={r.rating} size={16} /></div>}
                  {r.mood && <p className="text-xs text-gray-400 mt-2">Humor: {r.mood}{r.difficulty ? ` · Dificuldade: ${r.difficulty}` : ''}{r.would_recommend ? ` · Recomendaria: ${r.would_recommend}` : ''}</p>}
                  {r.review && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">"{r.review}"</p>}
                </div>
                <button onClick={() => deleteReading(r.id)} className="btn-ghost text-red-500 p-1.5"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="space-y-3">
          <button onClick={() => setShowQuoteForm(true)} className="btn-secondary text-sm"><Plus className="h-4 w-4" /> Adicionar citação</button>
          {showQuoteForm && (
            <div className="card p-4 space-y-3">
              <textarea className="input min-h-[80px]" placeholder="Citação favorita..." value={quoteForm.content} onChange={(e) => setQuoteForm({ ...quoteForm, content: e.target.value })} />
              <div className="flex gap-2">
                <input type="number" className="input max-w-[120px]" placeholder="Página" value={quoteForm.page} onChange={(e) => setQuoteForm({ ...quoteForm, page: e.target.value })} />
                <button onClick={saveQuote} className="btn-primary">Salvar</button>
                <button onClick={() => setShowQuoteForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          )}
          {quotes.length === 0 && !showQuoteForm ? (
            <div className="card p-8 text-center text-gray-500"><QuoteIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" /> Nenhuma citação registrada.</div>
          ) : quotes.map((q) => (
            <div key={q.id} className="card p-4 flex items-start gap-3">
              <QuoteIcon className="h-5 w-5 text-brand-400 shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm italic text-gray-700 dark:text-gray-300">"{q.content}"</p>
                {q.page && <p className="text-xs text-gray-400 mt-1">Página {q.page}</p>}
              </div>
              <button onClick={() => deleteQuote(q.id)} className="btn-ghost text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'review' && (
        <div className="space-y-3">
          {readings.filter((r) => r.review).length === 0 ? <div className="card p-8 text-center text-gray-500">Nenhuma resenha escrita ainda.</div> : readings.filter((r) => r.review).map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">{r.rating > 0 && <StarRating value={r.rating} size={14} />}<span className="text-xs text-gray-400">{r.end_date ?? r.start_date ?? ''}</span></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{r.review}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
