import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Goal, GoalType, Reading } from '@/lib/types';
import { Plus, Trash2, Target, Loader2, X, Pencil, Check } from 'lucide-react';

const GOAL_TYPES: { type: GoalType; label: string }[] = [
  { type: 'books_year', label: 'Livros por ano' },
  { type: 'pages_year', label: 'Páginas por ano' },
  { type: 'books_month', label: 'Livros por mês' },
  { type: 'pages_month', label: 'Páginas por mês' },
  { type: 'audio_hours', label: 'Horas de audiolivro' },
];

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<number>(12);

  const [form, setForm] = useState({
    type: 'books_year' as GoalType,
    target: 12,
    period: 'year',
    year: new Date().getFullYear(),
  });

  const load = async () => {
    setLoading(true);
    const { data: g } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    setGoals((g as Goal[]) ?? []);
    const { data: r } = await supabase.from('readings').select('*');
    setReadings((r as Reading[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    await supabase.from('goals').insert({
      type: form.type,
      target: form.target,
      period: form.period,
      year: form.year,
    });
    setShowForm(false);
    load();
  };

  const updateTarget = async (id: string, newTarget: number) => {
    await supabase.from('goals').update({ target: newTarget }).eq('id', id);
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    load();
  };

  const computeProgress = (goal: Goal): { current: number; pct: number } => {
    const now = new Date();
    const completed = readings.filter((r) => r.status === 'Concluído');
    let current = 0;
    switch (goal.type) {
      case 'books_year':
        current = completed.filter((r) => r.end_date && new Date(r.end_date).getFullYear() === goal.year).length;
        break;
      case 'pages_year':
        current = completed.filter((r) => r.end_date && new Date(r.end_date).getFullYear() === goal.year).reduce((s, r) => s + (r.pages_read || 0), 0);
        break;
      case 'books_month':
        current = completed.filter((r) => {
          if (!r.end_date) return false;
          const d = new Date(r.end_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        break;
      case 'pages_month':
        current = completed.filter((r) => {
          if (!r.end_date) return false;
          const d = new Date(r.end_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((s, r) => s + (r.pages_read || 0), 0);
        break;
      case 'audio_hours':
        current = completed.filter((r) => r.format === 'Audiolivro' && r.end_date && new Date(r.end_date).getFullYear() === goal.year).length;
        break;
    }
    return { current, pct: goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0 };
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe seus objetivos de leitura</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nova meta
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nova meta</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as GoalType })}>
                {GOAL_TYPES.map((g) => (
                  <option key={g.type} value={g.type}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Objetivo</label>
              <input type="number" className="input" value={form.target} onChange={(e) => setForm({ ...form, target: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Período</label>
              <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="year">Anual</option>
                <option value="month">Mensal</option>
              </select>
            </div>
            <div>
              <label className="label">Ano</label>
              <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })} />
            </div>
          </div>
          <button onClick={save} className="btn-primary">Criar meta</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" /> Nenhuma meta definida. Crie uma para acompanhar seu progresso.
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const { current, pct } = computeProgress(goal);
            const label = GOAL_TYPES.find((g) => g.type === goal.type)?.label ?? goal.type;
            const isEditing = editingId === goal.id;

            return (
              <div key={goal.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{label}</h3>
                    <p className="text-sm text-gray-400">
                      {goal.year} · {goal.period === 'year' ? 'Anual' : 'Mensal'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <button
                        onClick={() => updateTarget(goal.id, editDraft)}
                        className="btn-ghost text-emerald-500 p-1.5"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(goal.id);
                          setEditDraft(goal.target);
                        }}
                        className="btn-ghost text-gray-400 hover:text-brand-500 p-1.5"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remove(goal.id)} className="btn-ghost text-red-500 p-1.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 text-sm">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{current} /</span>
                      <input
                        type="number"
                        min="1"
                        className="input py-0.5 px-2 w-20 text-sm"
                        value={editDraft}
                        onChange={(e) => setEditDraft(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  ) : (
                    <span className="font-medium">
                      {current} / {goal.target}
                    </span>
                  )}
                  <span className="text-gray-400">{pct}%</span>
                </div>

                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {pct >= 100 && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                    🎉 Meta concluída!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default Goals;