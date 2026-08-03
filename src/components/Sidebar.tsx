import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { LayoutDashboard, Library, BookPlus, BookHeart, Target, Settings, Shield, X, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'Minha Estante', icon: Library },
  { to: '/add', label: 'Adicionar Livro', icon: BookPlus },
  { to: '/wishlist', label: 'Lista de Desejos', icon: BookHeart },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/admin', label: 'Administração', icon: Shield },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
          <button onClick={() => { navigate('/'); onClose(); }}><Logo /></button>
          <button onClick={onClose} className="lg:hidden btn-ghost p-1.5"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
              <item.icon className="h-5 w-5 shrink-0" /> {item.label}
            </NavLink>
          ))}
        </nav>
        {profile && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <button onClick={() => { navigate('/settings'); onClose(); }} className="flex items-center gap-3 w-full text-left rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2 transition">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold">
                  {(profile.display_name || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile.display_name ?? 'Usuário'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Star className="h-3 w-3" /> Meta: {profile.yearly_goal ?? 12} livros/ano</p>
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
