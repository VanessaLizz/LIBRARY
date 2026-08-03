import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Book, Author, Publisher, Series } from '@/lib/types';
import { Shield, Loader2, Edit2, Trash2, X, Check, Search, GitMerge, Tag, AlertCircle } from 'lucide-react';

export function Admin() {
  const [tab, setTab] = useState<'books' | 'authors' | 'publishers' | 'series' | 'genres' | 'merge'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // merge state
  const [mergeSource, setMergeSource] = useState<string>('');
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [mergeMsg, setMergeMsg] = useState<string | null>(null);

  // genre management
  const [newGenre, setNewGenre] = useState('');
  const [genreRename, setGenreRename] = useState<{ old: string; new: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: a }, { data: p }, { data: s }, { data: bg }] = await Promise.all([
      supabase.from('books').select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name))').order('title'),
      supabase.from('authors').select('*').order('name'),
      supabase.from('publishers').select('*').order('name'),
      supabase.from('series').select('*').order('name'),
      supabase.from('book_genres').select('genre'),
    ]);
    setBooks((b ?? []).map((x: any) => ({ ...x, authors: x.book_authors?.map((ba: any) => ba.author) ?? [] })) as Book[]);
    setAuthors((a as Author[]) ?? []);
    setPublishers((p as Publisher[]) ?? []);
    setSeriesList((s as Series[]) ?? []);
    const genreSet = new Set<string>();
    (bg ?? []).forEach((g: any) => genreSet.add(g.genre));
    setGenres(Array.from(genreSet).sort());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (book: Book) => { setEditing(book); setEditTitle(book.title); };
  const saveEdit = async () => { if (!editing) return; await supabase.from('books').update({ title: editTitle }).eq('id', editing.id); setEditing(null); load(); };
  const deleteBook = async (id: string) => { if (!confirm('Excluir este livro permanentemente?')) return; await supabase.from('books').delete().eq('id', id); load(); };
  const deleteAuthor = async (id: string) => { await supabase.from('authors').delete().eq('id', id); load(); };
  const deletePublisher = async (id: string) => { await supabase.from('publishers').delete().eq('id', id); load(); };
  const deleteSeries = async (id: string) => { await supabase.from('series').delete().eq('id', id); load(); };

  const handleMerge = async () => {
    setMergeMsg(null);
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) { setMergeMsg('Selecione dois livros diferentes.'); return; }
    // Move readings and quotes from source to target
    await supabase.from('readings').update({ book_id: mergeTarget }).eq('book_id', mergeSource);
    await supabase.from('quotes').update({ book_id: mergeTarget }).eq('book_id', mergeSource);
    await supabase.from('book_authors').delete().eq('book_id', mergeSource);
    await supabase.from('book_genres').delete().eq('book_id', mergeSource);
    await supabase.from('books').delete().eq('id', mergeSource);
    setMergeMsg('Livros mesclados com sucesso! O livro de origem foi removido.');
    setMergeSource(''); setMergeTarget('');
    load();
  };

  const addGenre = async () => {
    if (!newGenre.trim()) return;
    // Add genre to a placeholder or just track — genres are per-book, so we just show it
    setGenres((g) => [...new Set([...g, newGenre.trim()])].sort());
    setNewGenre('');
  };

  const renameGenre = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) { setGenreRename(null); return; }
    // Update all book_genres with this genre
    const { data } = await supabase.from('book_genres').select('book_id').eq('genre', oldName);
    if (data) {
      for (const row of data) {
        await supabase.from('book_genres').delete().eq('book_id', row.book_id).eq('genre', oldName);
        await supabase.from('book_genres').upsert({ book_id: row.book_id, genre: newName });
      }
      // Also update primary_genre on books
      await supabase.from('books').update({ primary_genre: newName }).eq('primary_genre', oldName);
    }
    setGenreRename(null);
    load();
  };

  const deleteGenre = async (genre: string) => {
    if (!confirm(`Remover o gênero "${genre}" de todos os livros?`)) return;
    await supabase.from('book_genres').delete().eq('genre', genre);
    await supabase.from('books').update({ primary_genre: null }).eq('primary_genre', genre);
    load();
  };

  const tabs = [
    { id: 'books' as const, label: 'Livros', count: books.length },
    { id: 'authors' as const, label: 'Autores', count: authors.length },
    { id: 'publishers' as const, label: 'Editoras', count: publishers.length },
    { id: 'series' as const, label: 'Séries', count: seriesList.length },
    { id: 'genres' as const, label: 'Gêneros', count: genres.length },
    { id: 'merge' as const, label: 'Mesclar duplicados', count: 0 },
  ];

  const filteredBooks = books.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-brand-500" /> Administração</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie e corrija metadados do catálogo</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
            {t.label}{t.count > 0 && ` (${t.count})`}
          </button>
        ))}
      </div>

      {tab !== 'merge' && tab !== 'genres' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-10" placeholder="Filtrar..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div> : (
        <div className="card overflow-hidden">
          {tab === 'books' && (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredBooks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3">
                  {b.cover_url ? <img src={b.cover_url} alt="" className="h-12 w-9 object-cover rounded" /> : <div className="h-12 w-9 bg-gray-100 dark:bg-slate-800 rounded" />}
                  {editing?.id === b.id ? <input className="input flex-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus /> : (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.title}</p>
                      <p className="text-xs text-gray-400 truncate">{b.authors?.map((a) => a.name).join(', ')} · {b.status}</p>
                    </div>
                  )}
                  {editing?.id === b.id ? (
                    <><button onClick={saveEdit} className="btn-ghost text-green-600 p-1.5"><Check className="h-4 w-4" /></button><button onClick={() => setEditing(null)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button></>
                  ) : (
                    <><button onClick={() => startEdit(b)} className="btn-ghost p-1.5"><Edit2 className="h-4 w-4" /></button><button onClick={() => deleteBook(b.id)} className="btn-ghost text-red-500 p-1.5"><Trash2 className="h-4 w-4" /></button></>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'authors' && (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {authors.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3">
                  <div><p className="font-medium text-sm">{a.name}</p>{a.country && <p className="text-xs text-gray-400">{a.country}</p>}</div>
                  <button onClick={() => deleteAuthor(a.id)} className="btn-ghost text-red-500 p-1.5"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'publishers' && (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {publishers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <div><p className="font-medium text-sm">{p.name}</p>{p.country && <p className="text-xs text-gray-400">{p.country}</p>}</div>
                  <button onClick={() => deletePublisher(p.id)} className="btn-ghost text-red-500 p-1.5"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'series' && (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {seriesList.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3">
                  <p className="font-medium text-sm">{s.name}</p>
                  <button onClick={() => deleteSeries(s.id)} className="btn-ghost text-red-500 p-1.5"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'genres' && (
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input className="input" placeholder="Novo gênero..." value={newGenre} onChange={(e) => setNewGenre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGenre()} />
                <button onClick={addGenre} className="btn-primary shrink-0"><Tag className="h-4 w-4" /> Adicionar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <div key={g} className="badge bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 gap-2">
                    {genreRename?.old === g ? (
                      <input className="bg-transparent border-b border-gray-300 dark:border-slate-600 outline-none text-xs w-20" value={genreRename.new} onChange={(e) => setGenreRename({ old: g, new: e.target.value })} onBlur={() => renameGenre(g, genreRename.new)} onKeyDown={(e) => e.key === 'Enter' && renameGenre(g, genreRename.new)} autoFocus />
                    ) : (
                      <>
                        <span>{g}</span>
                        <button onClick={() => setGenreRename({ old: g, new: g })} className="hover:text-brand-500"><Edit2 className="h-3 w-3" /></button>
                        <button onClick={() => deleteGenre(g)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'merge' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Selecione o livro de origem (será removido) e o livro de destino (receberá as leituras e citações). Todos os registros serão transferidos.</span>
              </div>
              {mergeMsg && <div className="rounded-lg bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-700 dark:text-green-300">{mergeMsg}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Livro de origem (remover)</label>
                  <select className="input" value={mergeSource} onChange={(e) => setMergeSource(e.target.value)}>
                    <option value="">Selecione...</option>
                    {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Livro de destino (manter)</label>
                  <select className="input" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                    <option value="">Selecione...</option>
                    {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleMerge} disabled={!mergeSource || !mergeTarget} className="btn-primary">
                <GitMerge className="h-4 w-4" /> Mesclar livros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
