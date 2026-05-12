'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Save, CalendarClock, CheckCircle2, Tag, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchPost, patchPost } from '@/lib/api'

interface Post {
  id: string
  beat_id: string
  titulo: string
  descricao: string
  tags: string[]
  purchase_link: string | null
  scheduled_at: string | null
  status: string
}

function defaultScheduledAt(): string {
  const d = new Date()
  d.setHours(18, 0, 0, 0)
  // formato datetime-local: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ReviewPage() {
  const { id: beatId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [purchaseLink, setPurchaseLink] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt())
  const [newTag, setNewTag] = useState('')

  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const data = await fetchPost(beatId, session.access_token)
        setPost(data)
        setTitulo(data.titulo ?? '')
        setDescricao(data.descricao ?? '')
        setTags(Array.isArray(data.tags) ? data.tags : [])
        setPurchaseLink(data.purchase_link ?? '')
        if (data.scheduled_at) setScheduledAt(data.scheduled_at.slice(0, 16))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [beatId])

  async function handleSave() {
    if (!post) return
    setSaving(true)
    setSavedOk(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      await patchPost(post.id, session.access_token, {
        titulo,
        descricao,
        tags,
        purchase_link: purchaseLink || undefined,
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSchedule() {
    if (!post) return
    setScheduling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      await patchPost(post.id, session.access_token, {
        titulo,
        descricao,
        tags,
        purchase_link: purchaseLink || undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'scheduled',
      })
      router.push('/beats')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao agendar')
    } finally {
      setScheduling(false)
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function addTag() {
    const t = newTag.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setNewTag('')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando conteúdo gerado...</span>
      </div>
    )
  }

  if (error && !post) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Revisar conteúdo do vídeo</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Edite o título, descrição e tags antes de agendar a publicação.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Título */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Título do vídeo</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Link de venda */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Link de venda / download{' '}
          <span className="text-xs text-zinc-500">(cole o link do BeatStars ou similar)</span>
        </label>
        <input
          type="url"
          value={purchaseLink}
          onChange={(e) => setPurchaseLink(e.target.value)}
          placeholder="https://www.beatstars.com/beat/..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Descrição do vídeo</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-xs text-zinc-200 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-zinc-400" />
          <label className="text-sm font-medium text-zinc-300">
            Tags do vídeo{' '}
            <span className="text-xs text-zinc-500">({tags.length} tags)</span>
          </label>
        </div>

        {/* Input para nova tag */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Adicionar tag..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            Adicionar
          </button>
        </div>

        {/* Lista de chips */}
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-500 transition hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
      >
        {savedOk ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
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
            Salvar edições
          </>
        )}
      </button>

      {/* Agendamento */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-violet-400" />
          <h2 className="text-base font-semibold text-white">Agendar publicação</h2>
        </div>
        <p className="text-xs text-zinc-500">
          Escolha a data e horário para publicar o vídeo no YouTube.
        </p>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="button"
          onClick={handleSchedule}
          disabled={scheduling || !scheduledAt}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scheduling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Agendando...
            </>
          ) : (
            'Confirmar agendamento →'
          )}
        </button>
      </div>
    </div>
  )
}
