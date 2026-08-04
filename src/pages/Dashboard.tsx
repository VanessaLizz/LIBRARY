/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Book, Reading } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BookOpen, Library, FileText, Star, Clock, Users, Building2,
  TrendingUp, Zap, Trophy, Target, Calendar, Award, Heart, XCircle,
  Pause, CheckCircle, RefreshCw, BookMarked, Globe, Flame, BarChart3,
} from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function Dashboard() {
  const { profile } = useAuth();
  const location = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: b } = await supabase
      .from('books')
      .select('*, publisher:publishers(name), series:series(name), book_authors(author:authors(name, country))')
      .order('created_at', { ascending: false });
    const mapped = (b ?? []).map((x: any) => ({ ...x, authors: x.book_authors?.map((ba: any) => ba.author) ?? [] })) as Book[];
    setBooks(mapped);
    const { data: r } = await supabase
      .from('readings')
      .select('*, book:books(title, pages, primary_genre, publisher:publishers(name), series:series(name), book_authors(author:authors(name, country)))')
      .order('end_date', { ascending: false });
    setReadings((r as Reading[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => loadData())
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData, location.pathname]);

  const stats = useMemo(() => {
    const completed = readings.filter((r) => r.status === 'Concluído');
    const totalPages = completed.reduce((s, r) => s + (r.pages_read || 0), 0);
    const rated = completed.filter((r) => r.rating > 0);
    const avgRating = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    const avgPages = completed.length ? Math.round(totalPages / completed.length) : 0;

    const daysPerBook = completed.filter((r) => r.start_date && r.end_date).map((r) => {
      const d = Math.ceil((new Date(r.end_date!).getTime() - new Date(r.start_date!).getTime()) / 86400000);
      return d > 0 ? d : 1;
    });
    const avgDays = daysPerBook.length ? Math.round(daysPerBook.reduce((s, d) => s + d, 0) / daysPerBook.length) : 0;
    const avgPagesPerDay = daysPerBook.length ? Math.round(totalPages / daysPerBook.reduce((s, d) => s + d, 0)) : 0;

    const readingDates = new Set<string>();
    completed.forEach((r) => {
      if (r.start_date && r.end_date) {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) readingDates.add(d.toISOString().split('T')[0]);
      }
    });
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (readingDates.has(d.toISOString().split('T')[0])) streak++;
      else if (i > 0) break;
    }

    const now = new Date();
    const monthsElapsed = now.getMonth() + 1;
    const completedThisYear = completed.filter((r) => r.end_date && new Date(r.end_date).getFullYear() === now.getFullYear());
    const avgBooksPerMonth = monthsElapsed > 0 ? (completedThisYear.length / monthsElapsed).toFixed(1) : '0';
    const avgReadingTime = avgDays;

    const authorSet = new Set<string>();
    const publisherSet = new Set<string>();
    books.forEach((b) => { b.authors?.forEach((a) => authorSet.add(a.name)); if (b.publisher?.name) publisherSet.add(b.publisher.name); });

    const fastest = completed.filter((r) => r.start_date && r.end_date).sort((a, b) => {
      const da = Math.ceil((new Date(a.end_date!).getTime() - new Date(a.start_date!).getTime()) / 86400000);
      const db = Math.ceil((new Date(b.end_date!).getTime() - new Date(b.start_date!).getTime()) / 86400000);
      return da - db;
    })[0];
    const slowest = completed.filter((r) => r.start_date && r.end_date).sort((a, b) => {
      const da = Math.ceil((new Date(a.end_date!).getTime() - new Date(a.start_date!).getTime()) / 86400000);
      const db = Math.ceil((new Date(b.end_date!).getTime() - new Date(b.start_date!).getTime()) / 86400000);
      return db - da;
    })[0];
    const longest = [...books].filter((b) => b.pages).sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0))[0];
    const shortest = [...books].filter((b) => b.pages).sort((a, b) => (a.pages ?? 0) - (b.pages ?? 0))[0];
    const bestRated = rated.sort((a, b) => b.rating - a.rating)[0];
    const worstRated = rated.sort((a, b) => a.rating - b.rating)[0];

    const genreMap = new Map<string, number>();
    completed.forEach((r) => { const b = books.find((x) => x.id === r.book_id); if (b?.primary_genre) genreMap.set(b.primary_genre, (genreMap.get(b.primary_genre) ?? 0) + 1); });
    const authorMap = new Map<string, number>();
    completed.forEach((r) => { const b = books.find((x) => x.id === r.book_id); b?.authors?.forEach((a) => authorMap.set(a.name, (authorMap.get(a.name) ?? 0) + 1)); });
    const pubMap = new Map<string, number>();
    completed.forEach((r) => { const b = books.find((x) => x.id === r.book_id); if (b?.publisher?.name) pubMap.set(b.publisher.name, (pubMap.get(b.publisher.name) ?? 0) + 1); });
    const langMap = new Map<string, number>();
    completed.forEach((r) => { const b = books.find((x) => x.id === r.book_id); if (b?.language) langMap.set(b.language, (langMap.get(b.language) ?? 0) + 1); });
    const formatMap = new Map<string, number>();
    completed.forEach((r) => formatMap.set(r.format, (formatMap.get(r.format) ?? 0) + 1));
    const seriesMap = new Map<string, number>();
    completed.forEach((r) => { const b = books.find((x) => x.id === r.book_id); if (b?.series?.name) seriesMap.set(b.series.name, (seriesMap.get(b.series.name) ?? 0) + 1); });
    const countryMap = new Map<string, number>();
    books.forEach((b) => b.authors?.forEach((a) => { if (a.country) countryMap.set(a.country, (countryMap.get(a.country) ?? 0) + 1); }));

    const rereads = readings.filter((r) => r.reread).length;
    const abandoned = books.filter((b) => b.status === 'Abandonado').length;
    const paused = books.filter((b) => b.status === 'Pausado').length;
    const done = books.filter((b) => b.status === 'Concluído').length;

    return {
      totalBooks: books.length, totalPages, avgPages, avgRating, avgDays, avgPagesPerDay,
      totalAuthors: authorSet.size, totalPublishers: publisherSet.size, completedCount: completed.length,
      streak, avgBooksPerMonth, avgReadingTime,
      fastest, slowest, longest, shortest, bestRated, worstRated,
      genreMap, authorMap, pubMap, langMap, formatMap, seriesMap, countryMap,
      rereads, abandoned, paused, done,
      favoriteAuthor: authorMap.size ? Array.from(authorMap.entries()).sort((a, b) => b[1] - a[1])[0] : null,
      favoriteGenre: genreMap.size ? Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1])[0] : null,
      topPublisher: pubMap.size ? Array.from(pubMap.entries()).sort((a, b) => b[1] - a[1])[0] : null,
      topSeries: seriesMap.size ? Array.from(seriesMap.entries()).sort((a, b) => b[1] - a[1])[0] : null,
    };
  }, [books, readings]);

  const readingsByYear = useMemo(() => {
    const map = new Map<number, number>();
    readings.filter((r) => r.status === 'Concluído' && r.end_date).forEach((r) => {
      const y = new Date(r.end_date!).getFullYear();
      map.set(y, (map.get(y) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: year.toString(), livros: count }));
  }, [readings]);

  const readingsByMonth = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const data: { month: string; livros: number; paginas: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const mr = readings.filter((r) => { if (r.status !== 'Concluído' || !r.end_date) return false; const rd = new Date(r.end_date); return rd.getMonth() === m && rd.getFullYear() === y; });
      data.push({ month: monthNames[m], livros: mr.length, paginas: mr.reduce((s, r) => s + (r.pages_read || 0), 0) });
    }
    return data;
  }, [readings]);

  const genreData = useMemo(() => Array.from(stats.genreMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })), [stats]);
  const authorData = useMemo(() => Array.from(stats.authorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, livros: count })), [stats]);
  const publisherData = useMemo(() => Array.from(stats.pubMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, livros: count })), [stats]);
  const langData = useMemo(() => Array.from(stats.langMap.entries()).map(([name, value]) => ({ name, value })), [stats]);
  const formatData = useMemo(() => Array.from(stats.formatMap.entries()).map(([name, value]) => ({ name, value })), [stats]);
  const countryData = useMemo(() => Array.from(stats.countryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, livros: value })), [stats]);
  const decadeData = useMemo(() => {
    const map = new Map<string, number>();
    books.filter((b) => b.publication_date).forEach((b) => {
      const y = new Date(b.publication_date!).getFullYear();
      const decade = Math.floor(y / 10) * 10;
      map.set(`${decade}s`, (map.get(`${decade}s`) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([decada, count]) => ({ decada, livros: count }));
  }, [books]);

  const yearProgress = useMemo(() => {
    const year = new Date().getFullYear();
    const completedThisYear = readings.filter((r) => r.status === 'Concluído' && r.end_date && new Date(r.end_date).getFullYear() === year).length;
    const goal = profile?.yearly_goal ?? 12;
    return { completed: completedThisYear, goal, pct: goal > 0 ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0 };
  }, [readings, profile]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const cardClass = 'card p-5';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral da sua vida de leitor</p>
      </div>

      <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-brand-100 text-sm">Meta de {new Date().getFullYear()}</p>
            <p className="text-3xl font-bold">{yearProgress.completed} / {yearProgress.goal} livros</p>
          </div>
          <Target className="h-10 w-10 text-brand-200" />
        </div>
        <div className="h-3 bg-brand-900/50 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${yearProgress.pct}%` }} />
        </div>
        <p className="text-brand-100 text-sm mt-2">{yearProgress.pct}% concluído</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Library} label="Total de livros" value={stats.totalBooks} color="text-blue-500" />
        <StatCard icon={FileText} label="Páginas lidas" value={stats.totalPages} color="text-emerald-500" />
        <StatCard icon={BookOpen} label="Média de páginas" value={stats.avgPages} color="text-amber-500" />
        <StatCard icon={Star} label="Média de notas" value={stats.avgRating.toFixed(1)} color="text-purple-500" />
        <StatCard icon={Clock} label="Média de dias" value={stats.avgDays} color="text-rose-500" />
        <StatCard icon={Users} label="Autores" value={stats.totalAuthors} color="text-cyan-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Dias consecutivos (streak)" value={stats.streak} color="text-orange-500" />
        <StatCard icon={BarChart3} label="Páginas por dia" value={stats.avgPagesPerDay} color="text-teal-500" />
        <StatCard icon={TrendingUp} label="Livros por mês" value={stats.avgBooksPerMonth} color="text-indigo-500" />
        <StatCard icon={Building2} label="Editoras" value={stats.totalPublishers} color="text-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-500" /> Leituras por ano</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={readingsByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="livros" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Leituras por mês (12 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={readingsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="livros" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" /> Páginas lidas por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={readingsByMonth}>
              <defs><linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="paginas" stroke="#f59e0b" strokeWidth={2} fill="url(#pageGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BookMarked className="h-4 w-4 text-purple-500" /> Gêneros mais lidos</h3>
          {genreData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name} labelLine={false}>
                  {genreData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-cyan-500" /> Autores mais lidos</h3>
          {authorData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={authorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="livros" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-500" /> Editoras mais lidas</h3>
          {publisherData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={publisherData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="livros" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cardClass}>
          <h3 className="font-semibold mb-4">Idiomas mais lidos</h3>
          {langData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={langData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {langData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={cardClass}>
          <h3 className="font-semibold mb-4">Formatos de leitura</h3>
          {formatData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={formatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {formatData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={cardClass}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-teal-500" /> Países dos autores</h3>
          {countryData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="livros" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-500" /> Livros por década de publicação</h3>
        {decadeData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={decadeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="decada" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="livros" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Estatísticas interessantes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FunFact icon={Zap} label="Livro mais rápido" value={(stats.fastest as any)?.book?.title ?? '—'} sub={stats.fastest ? `${Math.ceil((new Date(stats.fastest.end_date!).getTime() - new Date(stats.fastest.start_date!).getTime()) / 86400000)} dias` : ''} color="text-amber-500" />
          <FunFact icon={Clock} label="Livro mais demorado" value={(stats.slowest as any)?.book?.title ?? '—'} sub={stats.slowest ? `${Math.ceil((new Date(stats.slowest.end_date!).getTime() - new Date(stats.slowest.start_date!).getTime()) / 86400000)} dias` : ''} color="text-rose-500" />
          <FunFact icon={BookOpen} label="Maior livro" value={stats.longest?.title ?? '—'} sub={stats.longest ? `${stats.longest.pages} pág` : ''} color="text-blue-500" />
          <FunFact icon={BookOpen} label="Menor livro" value={stats.shortest?.title ?? '—'} sub={stats.shortest ? `${stats.shortest.pages} pág` : ''} color="text-cyan-500" />
          <FunFact icon={Star} label="Melhor nota" value={(stats.bestRated as any)?.book?.title ?? '—'} sub={stats.bestRated ? `${stats.bestRated.rating} estrelas` : ''} color="text-amber-500" />
          <FunFact icon={Star} label="Pior nota" value={(stats.worstRated as any)?.book?.title ?? '—'} sub={stats.worstRated ? `${stats.worstRated.rating} estrelas` : ''} color="text-gray-500" />
          <FunFact icon={BookMarked} label="Série mais lida" value={stats.topSeries?.[0] ?? '—'} sub={stats.topSeries ? `${stats.topSeries[1]} livros` : ''} color="text-purple-500" />
          <FunFact icon={Users} label="Autor favorito" value={stats.favoriteAuthor?.[0] ?? '—'} sub={stats.favoriteAuthor ? `${stats.favoriteAuthor[1]} livros` : ''} color="text-cyan-500" />
          <FunFact icon={BookMarked} label="Gênero favorito" value={stats.favoriteGenre?.[0] ?? '—'} sub={stats.favoriteGenre ? `${stats.favoriteGenre[1]} livros` : ''} color="text-emerald-500" />
          <FunFact icon={Building2} label="Editora frequente" value={stats.topPublisher?.[0] ?? '—'} sub={stats.topPublisher ? `${stats.topPublisher[1]} livros` : ''} color="text-indigo-500" />
          <FunFact icon={BarChart3} label="Páginas por dia" value={String(stats.avgPagesPerDay)} color="text-teal-500" />
          <FunFact icon={TrendingUp} label="Livros por mês" value={stats.avgBooksPerMonth} color="text-indigo-500" />
          <FunFact icon={Flame} label="Dias consecutivos" value={String(stats.streak)} color="text-orange-500" />
          <FunFact icon={Clock} label="Tempo médio leitura" value={`${stats.avgReadingTime} dias`} color="text-rose-500" />
          <FunFact icon={RefreshCw} label="Releituras" value={String(stats.rereads)} color="text-purple-500" />
          <FunFact icon={XCircle} label="Abandonados" value={String(stats.abandoned)} color="text-red-500" />
          <FunFact icon={Pause} label="Pausados" value={String(stats.paused)} color="text-amber-500" />
          <FunFact icon={CheckCircle} label="Concluídos" value={String(stats.done)} color="text-emerald-500" />
          <FunFact icon={Heart} label="Favoritos" value={String(readings.filter((r) => r.favorite).length)} color="text-rose-500" />
          <FunFact icon={Award} label="Editoras" value={String(stats.totalPublishers)} color="text-indigo-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Star; label: string; value: string | number; color: string }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function FunFact({ icon: Icon, label, value, sub, color }: { icon: typeof Star; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1"><Icon className={`h-3.5 w-3.5 ${color}`} /> {label}</div>
      <p className="font-semibold text-sm truncate" title={value}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Sem dados suficientes ainda</div>;
}
