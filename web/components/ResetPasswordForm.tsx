'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const [senha, setSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [sessaoOk, setSessaoOk] = useState<boolean | null>(null)

  // Quando o user clica no link do email, Supabase põe ele em modo recovery (sessão temporária).
  // Se a sessão não veio, o link expirou ou já foi usado.
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

  if (sessaoOk === false) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-6 text-center">
        <p className="text-sm font-medium text-white">Link inválido ou expirado</p>
        <p className="text-xs text-zinc-400">
          O link de recuperação só funciona por um tempo limitado e só pode ser usado uma vez.
          Peça um novo link para continuar.
        </p>
        <Link
          href="/forgot-password"
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  if (sessaoOk === null) {
    return (
      <div className="flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="text-sm font-medium text-white">Senha atualizada!</p>
        <p className="text-xs text-zinc-400">Redirecionando pro dashboard...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="text-sm font-medium text-zinc-300">
          Nova senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmaSenha" className="text-sm font-medium text-zinc-300">
          Confirmar senha
        </label>
        <input
          id="confirmaSenha"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmaSenha}
          onChange={(e) => setConfirmaSenha(e.target.value)}
          placeholder="Digite de novo"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
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
        className="flex items-center justify-center gap-2 pt-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancelar
      </Link>
    </form>
  )
}
