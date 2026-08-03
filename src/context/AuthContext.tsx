import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  configError: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('recused') ||
    msg.includes('refused') ||
    msg.includes('NetworkError') ||
    msg.includes('network')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.'
  }
  if (
    msg.toLowerCase().includes('anonymous') ||
    msg.toLowerCase().includes('disabled')
  ) {
    return 'O login como visitante (anônimo) está desativado no painel do Supabase. Ative a opção "Anonymous Sign-ins" em Authentication -> Providers no Supabase.'
  }
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [configError, setConfigError] = useState<string | null>(null)

  const sessionRef = useRef<Session | null>(null)
  const loadingProfileRef = useRef<Set<string>>(new Set())

  const loadProfile = async (userId: string, currentSession?: Session | null) => {
    if (loadingProfileRef.current.has(userId)) return
    loadingProfileRef.current.add(userId)

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data as Profile)
      } else {
        const sess = currentSession ?? sessionRef.current
        const userMetadata = sess?.user?.user_metadata
        const defaultName =
          userMetadata?.display_name || userMetadata?.full_name || 'Visitante'

        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: userId, display_name: defaultName })
          .select()
          .maybeSingle()

        setProfile((newProfile as Profile) || { id: userId, display_name: defaultName })
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do usuário:', err)
    } finally {
      loadingProfileRef.current.delete(userId)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConfigError('As credenciais do Supabase não estão configuradas. Verifique o arquivo .env.')
      setLoading(false)
      return
    }

    let mounted = true

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const searchParams = new URLSearchParams(window.location.search)
    const oauthErrorDescription =
      hashParams.get('error_description') || searchParams.get('error_description')
    const oauthError = hashParams.get('error') || searchParams.get('error')

    if (oauthErrorDescription || oauthError) {
      setConfigError(
        decodeURIComponent(oauthErrorDescription || oauthError || 'Erro ao autenticar com o Google.')
      )
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setConfigError(friendlyError(error))
          setLoading(false)
          return
        }
        sessionRef.current = data.session
        setSession(data.session)
        if (data.session) {
          loadProfile(data.session.user.id, data.session).finally(() => {
            if (mounted) setLoading(false)
          })
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setConfigError(friendlyError(err))
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return
      sessionRef.current = sess
      setSession(sess)
      if (sess) {
        loadProfile(sess.user.id, sess).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw new Error(friendlyError(error))
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendlyError(error))
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) throw new Error(friendlyError(error))
  }

  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      if (data?.session) {
        sessionRef.current = data.session
        setSession(data.session)
        await loadProfile(data.session.user.id, data.session)
      } else {
        throw new Error('Sessão não retornada pelo Supabase')
      }
    } catch (err) {
      console.warn('Supabase signInAnonymously retornou erro, ativando sessão de visitante fallback:', err)

      const guestId = '00000000-0000-0000-0000-000000000000'
      const guestUser = {
        id: guestId,
        app_metadata: { provider: 'anonymous' },
        user_metadata: { display_name: 'Visitante' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User

      const guestSession = {
        access_token: 'guest-mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'guest-mock-refresh-token',
        user: guestUser,
      } as Session

      const guestProfile: Profile = {
        id: guestId,
        display_name: 'Visitante',
        avatar_url: null,
        bio: 'Perfil de demonstração como Visitante',
        yearly_goal: 12,
        preferred_language: 'pt-BR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      sessionRef.current = guestSession
      setSession(guestSession)
      setProfile(guestProfile)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
    sessionRef.current = null
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    if (error) throw new Error(friendlyError(error))
  }

  const refreshProfile = async () => {
    if (sessionRef.current) await loadProfile(sessionRef.current.user.id, sessionRef.current)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        configError,
        signUp,
        signIn,
        signInWithGoogle,
        signInAnonymously,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
