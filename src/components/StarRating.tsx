import { Star } from 'lucide-react';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}

export function StarRating({ value, onChange, size = 16 }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(s === value ? 0 : s)}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star style={{ width: size, height: size }} className={s <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-slate-600'} />
        </button>
      ))}
    </div>
  );
}
