import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface PriorityItem {
  priority?: string | null;
}

interface PriorityChartProps {
  books?: PriorityItem[];
}

const ORDER = ['alta', 'média', 'baixa'] as const;
const LABELS: Record<string, string> = {
  alta: 'Alta',
  média: 'Média',
  media: 'Média',
  baixa: 'Baixa',
};

const COLORS: Record<string, string> = {
  alta: '#ef4444',
  média: '#f59e0b',
  baixa: '#64748b',
};

export function PriorityChart({ books = [] }: PriorityChartProps) {
  const data = useMemo(() => {
    if (!books || books.length === 0) return [];

    const map: Record<string, number> = { alta: 0, média: 0, baixa: 0 };

    books.forEach((b) => {
      if (b.priority) {
        const raw = b.priority.trim().toLowerCase();
        const key = raw === 'media' ? 'média' : raw;
        if (map[key] !== undefined) {
          map[key]++;
        }
      }
    });

    return ORDER.map((p) => ({
      name: LABELS[p] || p,
      key: p,
      value: map[p],
    }));
  }, [books]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) return <EmptyState />;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
        Livros por prioridade
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="value" name="Livros" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={COLORS[d.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-5 flex flex-col items-center justify-center h-[260px]">
      <p className="text-sm text-gray-400">Sem dados de prioridade ainda.</p>
    </div>
  );
}

export default PriorityChart;