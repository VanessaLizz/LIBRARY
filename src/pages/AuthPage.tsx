import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Mail, Lock, User, AlertCircle, ArrowLeft, UserCheck } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle, signInAnonymously, resetPassword, configError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === 'signin') { await signIn(email, password); navigate('/'); }
      else if (mode === 'signup') { await signUp(email, password, displayName); setInfo('Conta criada! Faça login para continuar.'); setMode('signin'); }
      else { await resetPassword(email); setInfo('Link de recuperação enviado para seu e-mail.'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Ocorreu um erro'); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(null);
    try { await signInWithGoogle(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro no login com Google'); }
  };

  const handleGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar como visitante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-fade-in">
          <div className="flex justify-center mb-6"><Logo /></div>
          <h1 className="text-2xl font-bold text-center mb-1">
            {mode === 'signin' && 'Bem-vindo de volta'}
            {mode === 'signup' && 'Crie sua conta'}
            {mode === 'reset' && 'Recuperar senha'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {mode === 'signin' && 'Acesse sua biblioteca pessoal'}
            {mode === 'signup' && 'Comece a acompanhar suas leituras'}
            {mode === 'reset' && 'Enviaremos um link para seu e-mail'}
          </p>

          {configError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{configError}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          {info && <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-700 dark:text-green-300">{info}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input className="input pl-10" placeholder="Seu nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
              </div>
            )}
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" className="input pl-10" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="password" className="input pl-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
            )}
            {mode === 'signin' && (
              <div className="text-right">
                <button type="button" onClick={() => { setMode('reset'); setError(null); setInfo(null); }} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">Esqueceu a senha?</button>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Carregando...' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-2.5">
                <button onClick={handleGoogle} disabled={loading} className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  Continuar com Google
                </button>

                <button onClick={handleGuest} disabled={loading} className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2">
                  <UserCheck className="h-5 w-5 text-gray-500" />
                  Entrar como visitante
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === 'signin' && (<>Não tem conta? <button onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Cadastre-se</button></>)}
            {mode === 'signup' && (<>Já tem conta? <button onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Entrar</button></>)}
            {mode === 'reset' && <button onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium hover:underline"><ArrowLeft className="h-4 w-4" /> Voltar ao login</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
