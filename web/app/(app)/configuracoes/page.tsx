'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  nome: string | null
  instagram: string | null
}

export default function ConfiguracoesPage() {
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [instagram, setInstagram] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_profiles')
        .select('nome, instagram')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setNome(data.nome ?? '')
        setInstagram(data.instagram ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedOk(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: user.id, nome: nome.trim() || null, instagram: instagram.trim().replace(/^@/, '') || null },
          { onConflict: 'user_id' },
        )

      if (upsertError) throw new Error(upsertError.message)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando...</span>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Esses dados aparecem automaticamente na descrição dos seus vídeos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Nome artístico / tag de produtor
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: prod. Zestro"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Instagram <span className="text-zinc-500">(sem o @)</span>
          </label>
          <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
            <span className="pl-4 text-sm text-zinc-500">@</span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
              placeholder="seuinstagram"
              className="flex-1 bg-transparent py-3 pr-4 text-sm text-white placeholder-zinc-600 outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {savedOk ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Salvo!
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </form>
    </div>
  )
}
