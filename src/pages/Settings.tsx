/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { exportJSON, exportCSV, parseCSV, parseJSON } from '@/lib/exportUtils';
import { User, Target, Save, Loader2, Download, Upload, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { Book } from '@/lib/types';

export function Settings() {
  const { profile, refreshProfile, user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [yearlyGoal, setYearlyGoal] = useState(12);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);


  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setYearlyGoal(profile.yearly_goal ?? 12);
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName, bio, avatar_url: avatarUrl, yearly_goal: yearlyGoal }).eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const [books, readings, quotes, wishlist] = await Promise.all([
      supabase.from('books').select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name)), book_genres(genre)'),
      supabase.from('readings').select('*'),
      supabase.from('quotes').select('*'),
      supabase.from('wishlist').select('*'),
    ]);
    const mappedBooks = (books.data ?? []).map((b: any) => ({ ...b, authors: b.book_authors?.map((ba: any) => ba.author) ?? [], genres: b.book_genres?.map((bg: any) => bg.genre) ?? [] }));
    if (format === 'json') {
      exportJSON({ books: mappedBooks, readings: readings.data, quotes: quotes.data, wishlist: wishlist.data }, 'leituradb-export.json');
    } else {
      exportCSV(mappedBooks as Book[]);
    }
  };

  const handleImport = async (file: File) => {
    setImportMsg(null);
    try {
      const text = await file.text();
      let count = 0;
      if (file.name.endsWith('.json')) {
        const data = parseJSON(text);
        if (data.books?.length) {
          for (const b of data.books) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, user_id, created_at, updated_at, publisher, series, authors, genres, book_authors, book_genres, ...rest } = b;
            await supabase.from('books').insert(rest);
            count++;
          }
        }
      } else if (file.name.endsWith('.csv')) {
        const rows = parseCSV(text);
        for (const row of rows) {
          await supabase.from('books').insert({
            title: row.title || row.titulo || 'Sem título',
            pages: row.pages ? parseInt(row.pages) : null,
            primary_genre: row.primary_genre || row.genre || row.genero || null,
            isbn13: row.isbn13 || row.isbn || null,
            isbn10: row.isbn10 || null,
            language: row.language || row.idioma || null,
            status: row.status || 'Quero Ler',
            format: row.format || 'Físico',
          });
          count++;
        }
      }
      setImportMsg(`${count} livros importados com sucesso!`);
    } catch {
      setImportMsg('Erro ao importar arquivo. Verifique o formato.');
    }
  };

  const exportPDF = async () => {
    // Open print dialog for PDF export of dashboard
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Profile */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-brand-500" /> Perfil</h2>
        <div className="flex items-center gap-4">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : (
            <div className="h-16 w-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xl font-bold">{(displayName.trim() || 'U')[0].toUpperCase()}</div>
          )}
          <div className="flex-1">
            <label className="label">URL do avatar</label>
            <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div><label className="label">Nome</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
        <div><label className="label">Bio</label><textarea className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." /></div>
        <div><label className="label flex items-center gap-2"><Target className="h-4 w-4 text-brand-500" /> Meta anual de leitura</label><input type="number" min={1} className="input max-w-[120px]" value={yearlyGoal} onChange={(e) => setYearlyGoal(parseInt(e.target.value) || 12)} /></div>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saved ? 'Salvo!' : 'Salvar alterações'}</button>
      </div>

      {/* Import/Export */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Download className="h-4 w-4 text-brand-500" /> Importar / Exportar dados</h2>
        <div>
          <label className="label">Exportar</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExport('json')} className="btn-secondary text-sm"><FileJson className="h-4 w-4" /> Exportar JSON</button>
            <button onClick={() => handleExport('csv')} className="btn-secondary text-sm"><FileSpreadsheet className="h-4 w-4" /> Exportar CSV</button>
            <button onClick={exportPDF} className="btn-secondary text-sm"><FileText className="h-4 w-4" /> Exportar PDF (impressão)</button>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-800 pt-3">
          <label className="label flex items-center gap-2"><Upload className="h-4 w-4 text-brand-500" /> Importar dados</label>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary text-sm cursor-pointer">
              <FileJson className="h-4 w-4" /> Importar JSON
              <input type="file" accept=".json" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
            </label>
            <label className="btn-secondary text-sm cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" /> Importar CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
            </label>
          </div>
          {importMsg && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{importMsg}</p>}
          <p className="text-xs text-gray-400 mt-2">Para Excel: salve sua planilha como CSV antes de importar.</p>
        </div>
      </div>
    </div>
  );
}
