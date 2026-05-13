'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message || 'Erro ao enviar e-mail. Tente de novo.')
    } else {
      setEnviado(true)
    }
    setLoading(false)
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-8 text-center">
          <MailCheck className="h-10 w-10 text-green-400" />
          <div>
            <p className="text-sm font-medium text-white">E-mail enviado!</p>
            <p className="mt-1 text-xs text-zinc-400">
              Se essa conta existir, você vai receber um link para criar uma nova senha em{' '}
              <span className="font-medium text-zinc-300">{email}</span>.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-500">
          Não chegou em alguns minutos? Verifique a caixa de spam ou{' '}
          <button
            type="button"
            onClick={() => setEnviado(false)}
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            tente de novo
          </button>
          .
        </p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar pro login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-300">
          E-mail da conta
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
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
            Enviando...
          </>
        ) : (
          'Enviar link de recuperação'
        )}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 pt-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar pro login
      </Link>
    </form>
  )
}
