/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Book } from '@/lib/types';
import { Menu, Search, Sun, Moon, LogOut } from 'lucide-react';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('books')
        .select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name))')
        .or(`title.ilike.%${query}%,isbn10.ilike.%${query}%,isbn13.ilike.%${query}%`)
        .limit(8);
      const mapped = (data ?? []).map((b: any) => ({ ...b, authors: b.book_authors?.map((ba: any) => ba.author) ?? [] })) as Book[];
      setResults(mapped);
    }, 250);
  }, [query]);

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
      <div className="flex items-center gap-3 px-4 h-16">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2"><Menu className="h-5 w-5" /></button>
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-10" placeholder="Buscar por título, autor, ISBN..." value={query}
            onChange={(e) => setQuery(e.target.value)} onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)} />
          {showResults && results.length > 0 && (
            <div className="absolute mt-2 w-full card p-2 max-h-96 overflow-y-auto animate-fade-in z-50">
              {results.map((book) => (
                <button key={book.id} onClick={() => { navigate(`/book/${book.id}`); setQuery(''); setShowResults(false); }}
                  className="flex items-center gap-3 w-full text-left rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2 transition">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="h-12 w-9 object-cover rounded" />
                  ) : (
                    <div className="h-12 w-9 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs">{book.title[0]}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    <p className="text-xs text-gray-400 truncate">{book.primary_genre} · {book.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={toggleTheme} className="btn-ghost p-2" title="Alternar tema">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={() => { signOut(); navigate('/auth'); }} className="btn-ghost p-2" title="Sair">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
