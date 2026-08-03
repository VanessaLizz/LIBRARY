import { BookOpenText } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
        <BookOpenText className="h-5 w-5" />
      </div>
      <span className="text-lg font-bold tracking-tight">Leitura<span className="text-brand-500">Lab</span></span>
    </div>
  );
}
