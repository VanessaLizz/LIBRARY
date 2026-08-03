import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WishlistItem } from '@/lib/types';
import { Plus, Trash2, ExternalLink, Star, Loader2, X } from 'lucide-react';

export function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', priority: 3, desired_price: '', store_url: '', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('wishlist').select('*').order('priority', { ascending: false });
    setItems((data as WishlistItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    await supabase.from('wishlist').insert({
      title: form.title, author: form.author || null, priority: form.priority,
      desired_price: form.desired_price ? parseFloat(form.desired_price) : null,
      store_url: form.store_url || null, notes: form.notes || null,
    });
    setForm({ title: '', author: '', priority: 3, desired_price: '', store_url: '', notes: '' });
    setShowForm(false); load();
  };

  const remove = async (id: string) => { await supabase.from('wishlist').delete().eq('id', id); load(); };

  const priorityColors: Record<number, string> = {
    5: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    4: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    3: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    2: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    1: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Lista de Desejos</h1><p className="text-sm text-gray-500 dark:text-gray-400">{items.length} livros desejados</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" /> Adicionar</button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Novo item</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Título *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="label">Autor</label><input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div><label className="label">Prioridade (1-5)</label><input type="number" min={1} max={5} className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 3 })} /></div>
            <div><label className="label">Preço desejado (R$)</label><input type="number" step="0.01" className="input" value={form.desired_price} onChange={(e) => setForm({ ...form, desired_price: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Link da loja</label><input className="input" value={form.store_url} onChange={(e) => setForm({ ...form, store_url: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <button onClick={save} className="btn-primary">Salvar</button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div> :
        items.length === 0 ? <div className="card p-12 text-center text-gray-500">Sua lista de desejos está vazia. Adicione livros que você quer comprar.</div> :
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <span className={`badge ${priorityColors[item.priority] ?? priorityColors[3]}`}><Star className="h-3 w-3" /> {item.priority}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                <p className="text-sm text-gray-400 truncate">{item.author}{item.desired_price && ` · R$ ${item.desired_price.toFixed(2)}`}{item.notes && ` · ${item.notes}`}</p>
              </div>
              {item.store_url && <a href={item.store_url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2"><ExternalLink className="h-4 w-4" /></a>}
              <button onClick={() => remove(item.id)} className="btn-ghost text-red-500 p-2"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>}
    </div>
  );
}
