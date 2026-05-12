'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Save, CalendarClock, CheckCircle2, Tag, X, ExternalLink, Trash2, Globe, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchPost, patchPost, deleteBeat } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'

const PLACEHOLDER_LINK = '[insira seu link de venda]'

function sincronizaLink(desc: string, linkAntigo: string | null, linkNovo: string): string {
  if (!linkNovo) return desc
  if (desc.includes(PLACEHOLDER_LINK)) {
    return desc.split(PLACEHOLDER_LINK).join(linkNovo)
  }
  if (linkAntigo && linkAntigo !== linkNovo && desc.includes(linkAntigo)) {
    return desc.split(linkAntigo).join(linkNovo)
  }
  return desc
}

interface Post {
  id: string
  beat_id: string
  titulo: string
  descricao: string
  tags: string[]
  purchase_link: string | null
  scheduled_at: string | null
  status: string
  privacy_status: 'public' | 'unlisted' | null
}

type PrivacyStatus = 'public' | 'unlisted'

function toLocalDatetimeInput(d: Date): string {
  // formato datetime-local: YYYY-MM-DDTHH:MM no fuso do navegador
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultScheduledAt(): string {
  const d = new Date()
  d.setHours(18, 0, 0, 0)
  return toLocalDatetimeInput(d)
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
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('public')
  const [newTag, setNewTag] = useState('')

  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)
  const [deletando, setDeletando] = useState(false)

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
        if (data.scheduled_at) {
          // Banco guarda em UTC; converte pro fuso local pro input datetime-local
          const localDate = new Date(data.scheduled_at)
          if (!isNaN(localDate.getTime())) setScheduledAt(toLocalDatetimeInput(localDate))
        }
        if (data.privacy_status === 'public' || data.privacy_status === 'unlisted') {
          setPrivacyStatus(data.privacy_status)
        }
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
      const descSincronizada = sincronizaLink(descricao, post.purchase_link, purchaseLink)
      if (descSincronizada !== descricao) setDescricao(descSincronizada)
      await patchPost(post.id, session.access_token, {
        titulo,
        descricao: descSincronizada,
        tags,
        purchase_link: purchaseLink || undefined,
      })
      setPost({ ...post, purchase_link: purchaseLink, descricao: descSincronizada })
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
      const descSincronizada = sincronizaLink(descricao, post.purchase_link, purchaseLink)
      await patchPost(post.id, session.access_token, {
        titulo,
        descricao: descSincronizada,
        tags,
        purchase_link: purchaseLink || undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'scheduled',
        privacy_status: privacyStatus,
      })
      router.push('/beats')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao agendar')
    } finally {
      setScheduling(false)
    }
  }

  async function handleDelete() {
    setDeletando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      await deleteBeat(beatId, session.access_token)
      router.push('/beats')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao deletar')
      setDeletando(false)
      setConfirmandoDelete(false)
    }
  }

  function abrirLinkVenda() {
    if (!purchaseLink) return
    let url = purchaseLink.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const placeholderNaDescricao = descricao.includes(PLACEHOLDER_LINK)
  const linkVaiAtualizar =
    !!purchaseLink &&
    (placeholderNaDescricao || (!!post?.purchase_link && post.purchase_link !== purchaseLink && descricao.includes(post.purchase_link)))

  // YouTube trunca a previa em ~120 chars; link beatstars.com/beat/... longo
  // estoura essa previa e fica cortado com "..." (visualmente nao clicavel).
  // O bsta.rs/XXXXX cabe inteiro e fica clicavel na previa.
  const linkEhBeatstarsLongo =
    !!purchaseLink && /(?:^|\/\/)(www\.)?beatstars\.com\/beat\//i.test(purchaseLink.trim())

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revisar conteúdo do vídeo</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Edite o título, descrição e tags antes de agendar a publicação.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmandoDelete(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          Deletar beat
        </button>
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
        <div className="flex gap-2">
          <input
            type="url"
            value={purchaseLink}
            onChange={(e) => setPurchaseLink(e.target.value)}
            placeholder="https://www.beatstars.com/beat/..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={abrirLinkVenda}
            disabled={!purchaseLink.trim()}
            title="Abrir link em nova aba"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-300"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </button>
        </div>
        {linkVaiAtualizar && (
          <p className="text-xs text-violet-400">
            ↳ Ao salvar, esse link será aplicado também na descrição do vídeo automaticamente.
          </p>
        )}
        {!purchaseLink && placeholderNaDescricao && (
          <p className="text-xs text-amber-400">
            ⚠ A descrição ainda tem o placeholder <code className="rounded bg-zinc-800 px-1">[insira seu link de venda]</code>. Cole o link aqui pra ser substituído.
          </p>
        )}
        {linkEhBeatstarsLongo && (
          <p className="text-xs text-amber-400">
            ⚠ Link longo do BeatStars vai aparecer cortado na prévia do YouTube e não fica clicável.
            Use o link curto: vá na página do beat no BeatStars → <b>Share</b> → copie o link <code className="rounded bg-zinc-800 px-1">bsta.rs/XXXXX</code>.
          </p>
        )}
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

        <div className="space-y-2 pt-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Visibilidade quando publicar
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrivacyStatus('public')}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                privacyStatus === 'public'
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>
                <span className="block font-medium">Público</span>
                <span className="block text-[10px] text-zinc-500">aparece em busca</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPrivacyStatus('unlisted')}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                privacyStatus === 'unlisted'
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <EyeOff className="h-4 w-4" />
              <span>
                <span className="block font-medium">Não listado</span>
                <span className="block text-[10px] text-zinc-500">só com o link</span>
              </span>
            </button>
          </div>
        </div>

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

      <ConfirmDialog
        open={confirmandoDelete}
        danger
        loading={deletando}
        title={`Deletar "${post?.titulo ?? 'este beat'}"?`}
        description="O áudio, capa, título, descrição, tags e o agendamento serão apagados permanentemente. Essa ação não pode ser desfeita."
        confirmLabel="Sim, deletar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => !deletando && setConfirmandoDelete(false)}
      />
    </div>
  )
}
