import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Book } from '@/lib/types';

interface FormatChartProps {
  books?: Book[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LABELS: Record<string, string> = {
  físico: 'Físico',
  fisico: 'Físico',
  ebook: 'E-book',
  'e-book': 'E-book',
  audiolivro: 'Audiolivro',
  audiobook: 'Audiolivro',
};

export function FormatChart({ books = [] }: FormatChartProps) {
  const data = useMemo(() => {
    if (!books || books.length === 0) return [];

    const map: Record<string, number> = {};

    books.forEach((b) => {
      const rawFormat = (b.format || 'físico').trim().toLowerCase();
      const label = LABELS[rawFormat] || b.format || 'Físico';
      map[label] = (map[label] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [books]);

  if (!data.length) return <EmptyState />;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
        Formatos de leitura
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-5 flex flex-col items-center justify-center h-[220px]">
      <p className="text-sm text-gray-400">Sem dados para exibir ainda.</p>
    </div>
  );
}

export default FormatChart;