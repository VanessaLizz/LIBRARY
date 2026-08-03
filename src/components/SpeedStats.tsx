import { useMemo } from 'react';
import { Reading } from '@/lib/types';
import { Zap, Turtle } from 'lucide-react';

interface SpeedStatsProps {
  readings: Reading[];
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export function SpeedStats({ readings = [] }: SpeedStatsProps) {
  const { fastest, slowest } = useMemo(() => {
    // Filtra leituras concluídas no formato do Bolt ('Concluído') com datas válidas
    const finished = readings.filter(
      (r) =>
        r.status === 'Concluído' &&
        r.start_date &&
        r.end_date &&
        new Date(r.end_date) >= new Date(r.start_date)
    );

    if (!finished.length) return { fastest: null, slowest: null };

    const withDays = finished.map((r) => ({
      ...r,
      days: daysBetween(r.start_date!, r.end_date!),
    }));

    const fastest = withDays.reduce((min, r) => (r.days < min.days ? r : min), withDays[0]);
    const slowest = withDays.reduce((max, r) => (r.days > max.days ? r : max), withDays[0]);

    return { fastest, slowest };
  }, [readings]);

  if (!fastest || !slowest) return null;

  const pagesFast = fastest.pages_read || fastest.total_pages;
  const pagesSlow = slowest.pages_read || slowest.total_pages;

  const pagesPerDayFast = pagesFast ? (pagesFast / fastest.days).toFixed(1) : null;
  const pagesPerDaySlow = pagesSlow ? (pagesSlow / slowest.days).toFixed(1) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Leitura mais rápida</p>
            <p className="truncate font-semibold leading-tight">{fastest.title}</p>
            <p className="mt-1 text-xs text-gray-400">
              {fastest.days} dia(s){pagesPerDayFast ? ` · ${pagesPerDayFast} pág/dia` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Turtle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Leitura mais lenta</p>
            <p className="truncate font-semibold leading-tight">{slowest.title}</p>
            <p className="mt-1 text-xs text-gray-400">
              {slowest.days} dia(s){pagesPerDaySlow ? ` · ${pagesPerDaySlow} pág/dia` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpeedStats;