'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react'
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

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Recuperar senha</h1>
        <p className="mt-2 text-sm text-white/60">Vamos te enviar um link no e-mail</p>
      </div>

      {enviado ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-8 text-center">
            <MailCheck className="h-10 w-10 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">E-mail enviado!</p>
              <p className="mt-1 text-xs text-white/60">
                Se essa conta existir, você vai receber um link para criar uma nova senha em{' '}
                <span className="font-medium text-white/90">{email}</span>.
              </p>
            </div>
          </div>
          <p className="text-center text-xs text-white/50">
            Não chegou em alguns minutos? Verifique o spam ou{' '}
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="font-medium text-white hover:text-white/70"
            >
              tente de novo
            </button>
            .
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar pro login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="E-mail da conta"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/50"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-white/20 transition hover:-translate-y-0.5 hover:bg-zinc-200 hover:shadow-white/40 disabled:translate-y-0 disabled:opacity-70"
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
            className="flex items-center justify-center gap-2 pt-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar pro login
          </Link>
        </form>
      )}
    </div>
  )
}
