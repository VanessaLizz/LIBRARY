import React from 'react';
import { Library, FileText, Star, TrendingUp } from 'lucide-react';
import { Reading } from '@/lib/types';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface StatCardsProps {
  readings: Reading[];
}

export function StatCards({ readings = [] }: StatCardsProps) {
  // No Bolt/Supabase, as leituras concluídas usam status 'Concluído'
  const completed = readings.filter((r) => r.status === 'Concluído');
  
  const totalPages = completed.reduce((sum, r) => sum + (r.pages_read || 0), 0);
  
  const rated = completed.filter((r) => r.rating && r.rating > 0);
  const avgRating = rated.length 
    ? (rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length).toFixed(1) 
    : '—';
    
  const currentYear = new Date().getFullYear();
  const readThisYear = completed.filter(
    (r) => r.end_date && new Date(r.end_date).getFullYear() === currentYear
  ).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard 
        icon={Library} 
        label="Livros lidos" 
        value={completed.length} 
        accent="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
      />
      <StatCard 
        icon={FileText} 
        label="Páginas lidas" 
        value={totalPages.toLocaleString('pt-BR')} 
        accent="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
      />
      <StatCard 
        icon={Star} 
        label="Avaliação média" 
        value={avgRating} 
        accent="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" 
      />
      <StatCard 
        icon={TrendingUp} 
        label={`Lidos em ${currentYear}`} 
        value={readThisYear} 
        accent="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" 
      />
    </div>
  );
}

export default StatCards;