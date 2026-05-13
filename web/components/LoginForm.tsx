'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(traduzirErro(error.message))
      } else {
        router.refresh()
        router.push('/dashboard')
      }
    } else {
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(traduzirErro(error.message))
      } else {
        setMessage('Verifique seu e-mail para confirmar o cadastro.')
      }
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(traduzirErro(error.message))
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="relative inline-block">
          <span className="absolute -inset-1 animate-pulse bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-blue-500/30 opacity-75 blur-xl" />
          <span className="relative text-3xl font-bold tracking-tight text-white">BeatPost</span>
        </h1>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          BUILT BY PRODUCERS. BUILT FOR THE GRIND.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Mail className="h-[18px] w-[18px] text-white/60" />
          </div>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-purple-500/50"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Lock className="h-[18px] w-[18px] text-white/60" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/60 outline-none transition focus:border-purple-500/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>

        {/* Remember + Forgot — só no modo login */}
        {mode === 'login' && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRemember((r) => !r)}
              className="flex items-center gap-2"
            >
              <span className="relative inline-block h-5 w-10">
                <span
                  className={`absolute inset-0 rounded-full transition-colors duration-200 ${
                    remember ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                />
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                    remember ? 'translate-x-5' : ''
                  }`}
                />
              </span>
              <span className="text-sm text-white/80 transition hover:text-white">Lembrar de mim</span>
            </button>
            <Link
              href="/forgot-password"
              className="text-sm text-white/80 transition hover:text-white"
            >
              Esqueci minha senha
            </Link>
          </div>
        )}

        {/* Mensagens */}
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
            {message}
          </p>
        )}

        {/* Botão submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-500 hover:shadow-purple-500/40 disabled:translate-y-0 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'login' ? 'Entrando...' : 'Criando...'}
            </>
          ) : mode === 'login' ? (
            'Entrar'
          ) : (
            'Criar conta'
          )}
        </button>
      </form>

      {/* Divider + Google */}
      <div className="mt-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-px w-full bg-white/10" />
          <span className="relative bg-transparent px-4 text-xs text-white/60">
            ou continue com
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
        >
          <GoogleIcon />
          Google
        </button>
      </div>

      {/* Toggle mode */}
      <p className="mt-8 text-center text-sm text-white/60">
        {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
            setMessage(null)
          }}
          className="font-medium text-white transition hover:text-purple-300"
        >
          {mode === 'login' ? 'Criar conta' : 'Entrar'}
        </button>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
  return msg
}
