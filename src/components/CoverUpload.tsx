import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, X } from 'lucide-react';

interface Props {
  value: string | null;
  onChange: (url: string) => void;
  userId: string;
}

export function CoverUpload({ value, onChange, userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('covers').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch {
      alert('Erro ao enviar capa. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="relative shrink-0">
        {value ? (
          <>
            <img src={value} alt="Capa" className="h-32 w-22 object-cover rounded-lg shadow" />
            <button onClick={() => onChange('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="h-32 w-22 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
            <Upload className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar arquivo de capa
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
        />
        <div>
          <label className="label">Ou cole a URL da capa</label>
          <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
        </div>
      </div>
    </div>
  );
}
