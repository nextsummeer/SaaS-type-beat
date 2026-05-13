'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const [senha, setSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [sessaoOk, setSessaoOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelado = false
    async function checa() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!cancelado) setSessaoOk(!!session)
    }
    checa()
    return () => { cancelado = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmaSenha) {
      setError('As senhas não batem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setError(error.message || 'Erro ao atualizar senha. Tente de novo.')
      setLoading(false)
      return
    }

    setSucesso(true)
    setLoading(false)
    setTimeout(() => {
      router.refresh()
      router.push('/dashboard')
    }, 1500)
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Nova senha</h1>
        <p className="mt-2 text-sm text-white/60">Defina a senha que você vai usar de agora em diante</p>
      </div>

      {sessaoOk === null ? (
        <div className="flex items-center justify-center gap-3 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : sessaoOk === false ? (
        <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-6 text-center">
          <p className="text-sm font-medium text-white">Link inválido ou expirado</p>
          <p className="text-xs text-white/60">
            O link de recuperação só funciona por um tempo limitado e só pode ser usado uma vez.
            Peça um novo link para continuar.
          </p>
          <Link
            href="/forgot-password"
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : sucesso ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
          <p className="text-sm font-medium text-white">Senha atualizada!</p>
          <p className="text-xs text-white/60">Redirecionando pro dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Lock className="h-[18px] w-[18px] text-white/60" />
            </div>
            <input
              type={showSenha ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Nova senha (mínimo 6 caracteres)"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/60 outline-none transition focus:border-purple-500/50"
            />
            <button
              type="button"
              onClick={() => setShowSenha((s) => !s)}
              aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
            >
              {showSenha ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Lock className="h-[18px] w-[18px] text-white/60" />
            </div>
            <input
              type={showSenha ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              placeholder="Confirme a senha"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-purple-500/50"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-500 hover:shadow-purple-500/40 disabled:translate-y-0 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar nova senha'
            )}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 pt-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Link>
        </form>
      )}
    </div>
  )
}
